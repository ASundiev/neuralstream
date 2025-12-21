
import { GoogleGenAI, Type } from "@google/genai";
import { RecommendationRequest, Movie, ContentType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// High-fidelity TMDB Access Token
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NjU4YmVlMDE0Njg1YjUzYmIwNTlmNTU5MDE2YjE1YyIsIm5iZiI6MTc2NjE3ODkzMy41Nywic3ViIjoiNjk0NWMwNzVhMWIzN2ZjYjlhYjFiZTdmIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.MvX0cWuSIuUiboWcnwIXabWu9FPptZAFhj6m9ivMLhE";

async function fetchPosterFromTmdb(title: string, year?: string): Promise<string | null> {
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
  const { watchedHistory, targetType, genre, mood, seedMovie, naturalLanguageQuery } = request;

  const context = watchedHistory
    .filter(m => (m.userRating || 0) >= 8)
    .map(m => m.title)
    .slice(0, 15)
    .join(', ');

  // Construct a prompt that prioritizes the natural language query if it exists
  const prompt = `
    TASK: GENERATE 8 PRECISE RECOMMENDATIONS.
    
    USER_HISTORY_NODES (Highly Rated): [${context}]
    
    NEURAL_OVERRIDE_SIGNAL (PRIMARY): ${naturalLanguageQuery ? `"${naturalLanguageQuery}"` : "NONE"}
    
    SECONDARY_FILTERS:
    - Modality: ${targetType}
    - Genre Axis: ${genre || "ALL"}
    - Affective State: ${mood || "UNCALIBRATED"}
    ${seedMovie ? `- Genetic Seed: Similar to "${seedMovie.title}"` : ""}

    INSTRUCTIONS:
    1. If a NEURAL_OVERRIDE_SIGNAL is provided, interpret the fuzzy intent (e.g., "non-stupid Christmas movie" implies intellectual or emotionally resonant holiday films).
    2. Cross-reference the override signal with the USER_HISTORY_NODES to ensure the recommendations align with the user's general quality bar.
    3. Ensure the result is strictly ${targetType === 'both' ? 'a mix of movies and series' : targetType}.
    4. Provide a unique "reason" for each that explains why it matches both the history and the override signal.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are the core logic of NeuralStream AI, a world-class cinema recommendation engine. You excel at interpreting complex, fuzzy, and natural language requests to find perfect content matches. You prioritize quality and sophisticated taste.",
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
