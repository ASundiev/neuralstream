
import { GoogleGenAI, Type } from "@google/genai";
import { RecommendationRequest, Movie, ContentType, WatchProvider } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TMDB_TOKEN = process.env.VITE_TMDB_TOKEN;

async function fetchTmdbMetadata(title: string, year?: string): Promise<{ posterUrl: string | null, providers: WatchProvider[], tmdbId: number | null }> {
  if (!TMDB_TOKEN || TMDB_TOKEN === 'undefined') {
    return { posterUrl: null, providers: [], tmdbId: null };
  }

  try {
    const cleanYear = year ? year.split(/[-–—]/)[0].trim().match(/\d{4}/)?.[0] : null;
    const query = encodeURIComponent(title);
    const url = `https://api.themoviedb.org/3/search/multi?query=${query}${cleanYear ? `&year=${cleanYear}` : ''}&include_adult=false&language=en-US&page=1`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_TOKEN}`,
        accept: 'application/json'
      }
    });

    if (!response.ok) return { posterUrl: null, providers: [], tmdbId: null };

    const data = await response.json();
    const match = data.results?.find((r: any) => 
      (r.title || r.name)?.toLowerCase() === title.toLowerCase()
    ) || data.results?.[0];

    if (!match) return { posterUrl: null, providers: [], tmdbId: null };

    // Fetch Providers
    const mediaType = match.media_type === 'tv' ? 'tv' : 'movie';
    const providerUrl = `https://api.themoviedb.org/3/${mediaType}/${match.id}/watch/providers`;
    const providerResponse = await fetch(providerUrl, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' }
    });

    let providers: WatchProvider[] = [];
    if (providerResponse.ok) {
      const pData = await providerResponse.json();
      providers = pData.results?.US?.flatrate || [];
    }

    return {
      posterUrl: match.poster_path ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${match.poster_path}` : null,
      providers,
      tmdbId: match.id
    };
  } catch (error) {
    console.error(`TMDB Handshake Error for ${title}:`, error);
  }
  return { posterUrl: null, providers: [], tmdbId: null };
}

export async function searchMovieForHistory(query: string): Promise<Movie | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `LOCATE OFFICIAL DATA FOR: "${query}". Return title, year, type, and genres.`,
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
    const metadata = await fetchTmdbMetadata(data.title, data.year);

    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      tmdbId: metadata.tmdbId || undefined,
      userRating: 8,
      rating: 8,
      posterUrl: metadata.posterUrl || `[SIGNAL_LOST]`,
      providers: metadata.providers
    };
  } catch (error) {
    console.error("Neural Search Failed:", error);
    return null;
  }
}

export async function getRecommendations(request: RecommendationRequest): Promise<{ movies: Movie[], sources: any[] }> {
  const { watchedHistory, feedbackHistory, targetType, genre, mood, seedMovie, naturalLanguageQuery, preferredProviders, isGuest } = request;

  const context = watchedHistory
    .filter(m => (m.userRating || 0) >= 8)
    .map(m => `${m.title} (${m.year})`)
    .slice(0, 20)
    .join(', ');

  const feedbackContext = feedbackHistory
    .map(f => `${f.feedback.type.toUpperCase()}: "${f.title}"${f.feedback.reason ? ` because ${f.feedback.reason}` : ''}`)
    .join(' | ');

  const systemInstruction = isGuest 
    ? "You are NeuralStream Guest AI. Provide popular, highly-rated recommendations based on the query. Keep descriptions brief."
    : "You are the core logic of NeuralStream AI. You specialize in deep taste analysis. Return high-quality, non-obvious recommendations.";

  const prompt = `
    TASK: GENERATE ${isGuest ? '6' : '8'} RECOMMENDATIONS.
    USER_WATCHED_HISTORY: [${context}]
    USER_FEEDBACK_SIGNALS: [${feedbackContext || "No feedback yet"}]
    NEURAL_OVERRIDE_SIGNAL: ${naturalLanguageQuery || "NONE"}
    MODALITY: ${targetType}
    GENRE: ${genre || "ALL"}
    MOOD: ${mood || "UNCALIBRATED"}
    PREFERRED_NETWORKS: ${preferredProviders?.join(', ') || "ANY"}
    ${seedMovie ? `SEED: Provide options strictly similar to "${seedMovie.title}"` : ""}

    INSTRUCTION: ${isGuest ? 'Focus on generally acclaimed hits matching the query.' : 'Use the feedback signals to pivot recommendations. If a user disliked something for a specific reason, avoid that trait.'}
    AVAILABILITY: Prioritize content known to be on ${preferredProviders?.length ? preferredProviders.join(' or ') : 'major streaming platforms'}.
    Do NOT recommend anything already in the USER_WATCHED_HISTORY.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], 
        systemInstruction: systemInstruction,
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
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const moviesWithMetadata = await Promise.all(results.map(async (item: any) => {
      const metadata = await fetchTmdbMetadata(item.title, item.year);
      return {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        tmdbId: metadata.tmdbId,
        posterUrl: metadata.posterUrl || `[SIGNAL_LOST]`,
        providers: metadata.providers
      };
    }));

    return { movies: moviesWithMetadata, sources };
  } catch (error) {
    console.error("Neural Stream Interrupt:", error);
    throw error;
  }
}
