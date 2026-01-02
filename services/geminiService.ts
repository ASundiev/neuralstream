
import { GoogleGenAI, Type } from "@google/genai";
import { RecommendationRequest, Movie, ContentType } from "../types";
import { generateNeuralPoster } from "./imageService";

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
    const posterUrl = await generateNeuralPoster(data.title, "");

    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      userRating: 8,
      rating: 8,
      posterUrl: posterUrl || `[SIGNAL_LOST]`,
      type: data.type.toLowerCase().includes('tv') || data.type.toLowerCase().includes('series') ? ContentType.SERIES : ContentType.MOVIE
    };
  } catch (error) {
    return null;
  }
}

export async function getRecommendations(request: RecommendationRequest): Promise<{ movies: Movie[], sources: any[] }> {
  const { watchedHistory, feedbackHistory, targetType, genre, mood, seedMovie, naturalLanguageQuery, isGuest, limit, excludeTitles, onProgress } = request;

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
    let currentProgress = 0;
    const report = (p: number) => {
      if (p > currentProgress && onProgress) {
        currentProgress = p;
        onProgress(currentProgress);
      }
    };

    report(5);

    // Creep progress while waiting for Gemini (0-40 range)
    const geminiCreep = setInterval(() => {
      if (currentProgress < 38) report(currentProgress + 1);
    }, 200);

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

    clearInterval(geminiCreep);
    report(40);

    const results = JSON.parse(response.text);
    const totalCount = results.length;
    let completedCount = 0;

    const moviesWithMetadata = await Promise.all(results.map(async (item: any) => {
      // Small creep while waiting for each poster
      const posterUrl = await generateNeuralPoster(item.title, item.description);
      completedCount++;

      const targetAfterThis = 40 + Math.floor((completedCount / totalCount) * 60);
      report(targetAfterThis);

      return {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        posterUrl: posterUrl || `[SIGNAL_LOST]`,
        type: item.type.toLowerCase().includes('tv') || item.type.toLowerCase().includes('series') ? ContentType.SERIES : ContentType.MOVIE
      };
    }));

    report(100);
    return { movies: moviesWithMetadata, sources: [] };
  } catch (error) {
    console.error("ENGINE_SYNTHESIS_ERROR:", error);
    throw error;
  }
}
