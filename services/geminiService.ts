
import { GoogleGenAI, Type } from "@google/genai";
import { RecommendationRequest, Movie, ContentType } from "../types";

// The Gemini API key is obtained exclusively from process.env.API_KEY
// In development, you can create a .env file with VITE_API_KEY=your_key
const API_KEY = process.env.API_KEY;

let ai: any = null;
if (API_KEY && API_KEY !== 'undefined') {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

const TMDB_TOKEN = process.env.VITE_TMDB_TOKEN;

async function fetchPosterFromTmdb(title: string, year?: string): Promise<string | null> {
  if (!TMDB_TOKEN || TMDB_TOKEN === 'undefined') {
    return null;
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

    if (!response.ok) return null;

    const data = await response.json();
    const match = data.results?.find((r: any) => 
      (r.title || r.name)?.toLowerCase() === title.toLowerCase()
    ) || data.results?.[0];

    if (match?.poster_path) {
      return `https://image.tmdb.org/t/p/w600_and_h900_bestv2${match.poster_path}`;
    }
  } catch (error) {
    console.error(`TMDB Handshake Error for ${title}:`, error);
  }
  return null;
}

export async function searchMovieForHistory(query: string): Promise<Movie | null> {
  if (!ai) throw new Error("NEURAL_ENGINE_OFFLINE: Missing API_KEY");
  
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
    const posterUrl = await fetchPosterFromTmdb(data.title, data.year);

    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      userRating: 8,
      rating: 8,
      posterUrl: posterUrl || `[SIGNAL_LOST]`
    };
  } catch (error) {
    console.error("Neural Search Failed:", error);
    return null;
  }
}

export async function getRecommendations(request: RecommendationRequest): Promise<{ movies: Movie[], sources: any[] }> {
  if (!ai) throw new Error("NEURAL_ENGINE_OFFLINE: Missing API_KEY");
  
  const { watchedHistory, targetType, genre, mood, seedMovie, naturalLanguageQuery } = request;

  const context = watchedHistory
    .filter(m => (m.userRating || 0) >= 8)
    .map(m => m.title)
    .slice(0, 15)
    .join(', ');

  const prompt = `
    TASK: GENERATE 8 PRECISE RECOMMENDATIONS.
    USER_HISTORY_NODES: [${context}]
    NEURAL_OVERRIDE_SIGNAL: ${naturalLanguageQuery || "NONE"}
    MODALITY: ${targetType}
    GENRE: ${genre || "ALL"}
    MOOD: ${mood || "UNCALIBRATED"}
    ${seedMovie ? `SEED: Similar to "${seedMovie.title}"` : ""}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are the core logic of NeuralStream AI. Interpret history and fuzzy queries to find perfect matches.",
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

    const moviesWithPosters = await Promise.all(results.map(async (item: any) => {
      const posterUrl = await fetchPosterFromTmdb(item.title, item.year);
      return {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        posterUrl: posterUrl || `[SIGNAL_LOST]`
      };
    }));

    return { movies: moviesWithPosters, sources };
  } catch (error) {
    console.error("Neural Stream Interrupt:", error);
    throw error;
  }
}
