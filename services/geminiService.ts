
import { GoogleGenAI, Type } from "@google/genai";
import { RecommendationRequest, Movie, ContentType, WatchProvider } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Robust token retrieval: handle potential stringified "undefined" or empty strings from build systems
const TMDB_TOKEN = (process.env.VITE_TMDB_TOKEN && process.env.VITE_TMDB_TOKEN !== 'undefined' && process.env.VITE_TMDB_TOKEN !== '') 
  ? process.env.VITE_TMDB_TOKEN 
  : null;

async function fetchTmdbMetadata(title: string, year?: string, type?: string, knownTmdbId?: number): Promise<{ posterUrl: string | null, providers: WatchProvider[], tmdbId: number | null }> {
  if (!TMDB_TOKEN) {
    return { posterUrl: null, providers: [], tmdbId: knownTmdbId || null };
  }

  try {
    const isTV = type?.toLowerCase().includes('series') || type?.toLowerCase().includes('tv') || type === ContentType.SERIES;
    const searchType = isTV ? 'tv' : 'movie';
    const cleanYear = year ? year.split(/[-–—]/)[0].trim().match(/\d{4}/)?.[0] : null;

    // Detection: v3 keys are 32 chars hex. v4 tokens are long hashes.
    const isV3 = TMDB_TOKEN.length < 50;
    const baseUrl = `https://api.themoviedb.org/3`;
    
    // Auth configuration: v3 uses query param, v4 uses Bearer header
    const authParams = isV3 ? `&api_key=${TMDB_TOKEN}` : '';
    const authHeader = isV3 ? {} : { 'Authorization': `Bearer ${TMDB_TOKEN}` };

    let matchId = knownTmdbId;

    if (!matchId) {
      const query = encodeURIComponent(title);
      const yearKey = isTV ? 'first_air_date_year' : 'year';
      const searchUrl = `${baseUrl}/search/${searchType}?query=${query}${cleanYear ? `&${yearKey}=${cleanYear}` : ''}&include_adult=false&language=en-US&page=1${authParams}`;
      
      const response = await fetch(searchUrl, { 
        headers: { ...authHeader, 'Accept': 'application/json' },
        mode: 'cors'
      }).catch(err => {
        console.warn("TMDB_SEARCH_FETCH_FAILED:", err);
        return null;
      });

      if (response?.ok) {
        const data = await response.json();
        const match = data.results?.find((r: any) => 
          (r.title || r.name)?.toLowerCase() === title.toLowerCase()
        ) || data.results?.[0];
        matchId = match?.id;
      }
    }

    if (!matchId) return { posterUrl: null, providers: [], tmdbId: null };

    // Fetch details and providers in parallel
    const detailParams = isV3 ? `?api_key=${TMDB_TOKEN}` : '';
    const [detailsRes, providersRes] = await Promise.all([
      fetch(`${baseUrl}/${searchType}/${matchId}${detailParams}`, { 
        headers: { ...authHeader, 'Accept': 'application/json' } 
      }).catch(() => null),
      fetch(`${baseUrl}/${searchType}/${matchId}/watch/providers${detailParams}`, { 
        headers: { ...authHeader, 'Accept': 'application/json' } 
      }).catch(() => null)
    ]);

    let posterUrl = null;
    if (detailsRes?.ok) {
      const details = await detailsRes.json();
      if (details.poster_path) {
        posterUrl = `https://image.tmdb.org/t/p/w600_and_h900_bestv2${details.poster_path}`;
      }
    }

    let providers: WatchProvider[] = [];
    if (providersRes?.ok) {
      const pData = await providersRes.json();
      providers = pData.results?.US?.flatrate || [];
    }

    return { posterUrl, providers, tmdbId: matchId };
  } catch (error) {
    console.error("TMDB_METADATA_EXCEPTION:", error);
    return { posterUrl: null, providers: [], tmdbId: knownTmdbId || null };
  }
}

export async function searchMovieForHistory(query: string): Promise<Movie | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `LOCATE_OFFICIAL_CONTENT: "${query}". Use Google Search to find the exact title, year, official TMDB ID, and a DIRECT HIGH-QUALITY POSTER IMAGE URL (ending in .jpg or .png).`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            year: { type: Type.STRING },
            type: { type: Type.STRING },
            genres: { type: Type.ARRAY, items: { type: Type.STRING } },
            tmdbId: { type: Type.INTEGER },
            searchPosterUrl: { type: Type.STRING, description: "Direct URL to the poster image file." }
          },
          required: ["title", "year", "type", "genres"]
        }
      }
    });

    const data = JSON.parse(response.text);
    const metadata = await fetchTmdbMetadata(data.title, data.year, data.type, data.tmdbId);

    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      tmdbId: metadata.tmdbId || data.tmdbId || undefined,
      userRating: 8,
      rating: 8,
      posterUrl: metadata.posterUrl || data.searchPosterUrl || `[SIGNAL_LOST]`,
      providers: metadata.providers,
      type: data.type.toLowerCase().includes('tv') || data.type.toLowerCase().includes('series') ? ContentType.SERIES : ContentType.MOVIE
    };
  } catch (error) {
    console.error("NEURAL_SEARCH_FAILURE:", error);
    return null;
  }
}

export async function getRecommendations(request: RecommendationRequest): Promise<{ movies: Movie[], sources: any[] }> {
  const { watchedHistory, feedbackHistory, targetType, genre, mood, seedMovie, naturalLanguageQuery, preferredProviders, isGuest } = request;

  const context = watchedHistory
    .filter(m => (m.userRating || 0) >= 7)
    .map(m => `${m.title} (${m.year})`)
    .slice(0, 30)
    .join(', ');

  const feedbackContext = feedbackHistory
    .map(f => `${f.feedback.type.toUpperCase()}: "${f.title}"${f.feedback.reason ? ` because ${f.feedback.reason}` : ''}`)
    .join(' | ');

  const prompt = `
    GENERATE ${isGuest ? '6' : '8'} HIGH-QUALITY RECOMMENDATIONS based on user taste profile.
    
    TRAINING_DATA:
    - WATCHED_NODES: [${context}]
    - FEEDBACK_SIGNALS: [${feedbackContext || "NONE"}]
    - PARAMETER_OVERRIDE: ${naturalLanguageQuery || "NONE"}
    - PREFERRED_MODALITY: ${targetType}
    - GENRE_AXIS: ${genre || "ALL"}
    - EMOTIONAL_MOOD: ${mood || "UNCALIBRATED"}
    - NETWORK_PREFERENCE: ${preferredProviders?.join(', ') || "ANY"}
    ${seedMovie ? `- SEED_ANCHOR: Strictly similar to "${seedMovie.title}"` : ""}

    FOR EVERY RECOMMENDATION:
    1. Find the official TMDB ID via Google Search.
    2. Crucial: Provide a DIRECT high-quality POSTER IMAGE URL (must be a valid image file link).
    3. Synthesize a "reason" derived from the user's specific history.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], 
        systemInstruction: "You are the NeuralStream Recommendation Engine. You provide surgically precise content matches. You MUST use Google Search to verify all TMDB IDs and find direct, valid poster image URLs for all output items.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              year: { type: Type.STRING },
              type: { type: Type.STRING },
              genres: { type: Type.ARRAY, items: { type: Type.STRING } },
              rating: { type: Type.NUMBER },
              description: { type: Type.STRING },
              reason: { type: Type.STRING },
              tmdbId: { type: Type.INTEGER },
              searchPosterUrl: { type: Type.STRING, description: "A direct high-quality URL to the movie poster image file." }
            },
            required: ["title", "year", "type", "genres", "rating", "description", "reason"]
          }
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("EMPTY_ENGINE_RESPONSE");
    
    const results = JSON.parse(textOutput);
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const moviesWithMetadata = await Promise.all(results.map(async (item: any) => {
      const metadata = await fetchTmdbMetadata(item.title, item.year, item.type, item.tmdbId);
      
      // Primary: TMDB API, Secondary: Gemini Search Result, Tertiary: Fallback string
      const finalPosterUrl = metadata.posterUrl || (item.searchPosterUrl && item.searchPosterUrl.startsWith('http') ? item.searchPosterUrl : `[SIGNAL_LOST]`);

      return {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        tmdbId: metadata.tmdbId || item.tmdbId,
        posterUrl: finalPosterUrl,
        providers: metadata.providers,
        type: item.type.toLowerCase().includes('tv') || item.type.toLowerCase().includes('series') ? ContentType.SERIES : ContentType.MOVIE
      };
    }));

    return { movies: moviesWithMetadata, sources };
  } catch (error) {
    console.error("NEURAL_SYNTHESIS_INTERRUPT:", error);
    throw error;
  }
}
