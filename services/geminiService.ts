
import { GoogleGenAI, Type } from "@google/genai";
import { RecommendationRequest, Movie, ContentType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


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

    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      userRating: 8,
      rating: 8,
      posterUrl: `[SIGNAL_LOST]`,
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

    const moviesWithMetadata = results.map((item: any) => {
      return {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        posterUrl: `[SIGNAL_LOST]`,
        type: item.type.toLowerCase().includes('tv') || item.type.toLowerCase().includes('series') ? ContentType.SERIES : ContentType.MOVIE
      };
    });

    return { movies: moviesWithMetadata, sources: [] };
  } catch (error) {
    console.error("ENGINE_SYNTHESIS_ERROR:", error);
    throw error;
  }
}
