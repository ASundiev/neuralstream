
import { GoogleGenAI, Type } from "@google/genai";
import { RecommendationRequest, Movie, ContentType, WatchProvider } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TMDB_TOKEN = (process.env.VITE_TMDB_TOKEN && process.env.VITE_TMDB_TOKEN !== 'undefined' && process.env.VITE_TMDB_TOKEN !== '')
  ? process.env.VITE_TMDB_TOKEN
  : null;

/**
 * Strict Metadata Retrieval from TMDB.
 * Enforces precise title and year matching to prevent mismatched posters.
 */
async function fetchTmdbMetadata(title: string, year?: string, type?: string): Promise<{ posterUrl: string | null, providers: WatchProvider[], tmdbId: number | null }> {
  if (!TMDB_TOKEN) return { posterUrl: null, providers: [], tmdbId: null };

  try {
    const isTV = type?.toLowerCase().includes('series') || type?.toLowerCase().includes('tv') || type === ContentType.SERIES;
    const searchType = isTV ? 'tv' : 'movie';
    const cleanYear = year ? year.split(/[-–—]/)[0].trim().match(/\d{4}/)?.[0] : null;

    const baseUrl = `https://api.themoviedb.org/3`;
    // Supports both v4 tokens and v3 API keys
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    let authParams = '';

    if (TMDB_TOKEN.length > 50) {
      headers['Authorization'] = `Bearer ${TMDB_TOKEN}`;
    } else {
      authParams = `&api_key=${TMDB_TOKEN}`;
    }

    const query = encodeURIComponent(title);
    const yearParam = isTV ? 'first_air_date_year' : 'primary_release_year';
    const searchUrl = `${baseUrl}/search/${searchType}?query=${query}${cleanYear ? `&${yearParam}=${cleanYear}` : ''}&include_adult=false&language=en-US&page=1${authParams}`;

    const searchResponse = await fetch(searchUrl, { headers }).catch(() => null);
    if (!searchResponse || !searchResponse.ok) return { posterUrl: null, providers: [], tmdbId: null };

    const searchData = await searchResponse.json();
    const results = searchData.results || [];

    // Rigorous String Matching
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetNorm = normalize(title);

    const match = results.find((r: any) => {
      const rTitle = normalize(r.title || r.name || "");
      const rDate = (r.release_date || r.first_air_date || "").split('-')[0];
      const titleMatch = rTitle === targetNorm;
      const yearMatch = !cleanYear || rDate === cleanYear;
      return titleMatch && yearMatch;
    }) || results[0];

    if (!match) return { posterUrl: null, providers: [], tmdbId: null };

    // Parallel fetch for details and providers
    const [detailsRes, providersRes] = await Promise.all([
      fetch(`${baseUrl}/${searchType}/${match.id}${authParams ? '?' + authParams.slice(1) : ''}`, { headers }).catch(() => null),
      fetch(`${baseUrl}/${searchType}/${match.id}/watch/providers${authParams ? '?' + authParams.slice(1) : ''}`, { headers }).catch(() => null)
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

    return { posterUrl, providers, tmdbId: match.id };
  } catch (error) {
    return { posterUrl: null, providers: [], tmdbId: null };
  }
}

export async function searchMovieForHistory(query: string): Promise<Movie | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `EXTRACT_MEDIA_INFO: "${query}". Return title, year, type.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            year: { type: Type.STRING },
            type: { type: Type.STRING },
            genres: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "year", "type", "genres"]
        }
      }
    });

    const data = JSON.parse(response.text);
    const metadata = await fetchTmdbMetadata(data.title, data.year, data.type);

    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      tmdbId: metadata.tmdbId || undefined,
      userRating: 8,
      rating: 8,
      posterUrl: metadata.posterUrl || `[SIGNAL_LOST]`,
      providers: metadata.providers,
      type: data.type.toLowerCase().includes('tv') || data.type.toLowerCase().includes('series') ? ContentType.SERIES : ContentType.MOVIE
    };
  } catch (error) {
    return null;
  }
}

export async function getRecommendations(request: RecommendationRequest): Promise<{ movies: Movie[], sources: any[] }> {
  const { watchedHistory, feedbackHistory, targetType, genre, mood, seedMovie, naturalLanguageQuery, isGuest, limit, excludeTitles } = request;

  const context = watchedHistory
    .filter(m => (m.userRating || 0) >= 7)
    .map(m => `${m.title} (${m.year})`)
    .slice(0, 20)
    .join(', ');

  const prompt = `
    GENERATE ${limit || (isGuest ? '6' : '8')} RECOMMENDATIONS.
    HISTORY: [${context}]
    SIGNALS: [${feedbackHistory.map(f => `${f.title}: ${f.feedback.type}`).join(', ')}]
    MODALITY: ${targetType}
    GENRE: ${genre || "ALL"}
    MOOD: ${mood || "ANY"}
    ${naturalLanguageQuery ? `USER_REQUEST: ${naturalLanguageQuery}` : ""}
    ${seedMovie ? `SEED_SIMILARITY: ${seedMovie.title}` : ""}
    ${excludeTitles && excludeTitles.length > 0 ? `STRICT_EXCLUSION: [${excludeTitles.join(', ')}]` : ""}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `You are the NeuralStream Recommendation Engine. Only return Title, Year, Type, and Genres. No image links.${excludeTitles && excludeTitles.length > 0 ? ` DO NOT RECOMMEND ANY OF THESE TITLES: ${excludeTitles.join(', ')}.` : ""}`,
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
              reason: { type: Type.STRING }
            },
            required: ["title", "year", "type", "genres", "rating", "description", "reason"]
          }
        }
      }
    });

    const results = JSON.parse(response.text);

    const moviesWithMetadata = await Promise.all(results.map(async (item: any) => {
      const metadata = await fetchTmdbMetadata(item.title, item.year, item.type);
      return {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        tmdbId: metadata.tmdbId || undefined,
        posterUrl: metadata.posterUrl || `[SIGNAL_LOST]`,
        providers: metadata.providers,
        type: item.type.toLowerCase().includes('tv') || item.type.toLowerCase().includes('series') ? ContentType.SERIES : ContentType.MOVIE
      };
    }));

    return { movies: moviesWithMetadata, sources: [] };
  } catch (error) {
    console.error("ENGINE_SYNTHESIS_ERROR:", error);
    throw error;
  }
}
