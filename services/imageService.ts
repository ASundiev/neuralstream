import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Initialize Supabase client for asset management
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const posterCache: Record<string, string> = {};

/**
 * Utility to convert base64 to Blob for storage upload
 */
function base64ToBlob(base64: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Generates or retrieves a stylistic illustrated poster.
 * Implements a "Cache-Aside" pattern with Supabase Storage.
 */
export async function generateNeuralPoster(title: string, description: string = ''): Promise<string | null> {
  const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `${sanitizedTitle}.png`;

  // Layer 1: Memory Cache
  if (posterCache[title]) return posterCache[title];

  // Layer 2: Cloud Storage Check
  if (supabase) {
    const { data } = supabase.storage.from('neural-posters').getPublicUrl(fileName);
    try {
      const checkRes = await fetch(data.publicUrl, { method: 'HEAD' });
      if (checkRes.ok) {
        posterCache[title] = data.publicUrl;
        return data.publicUrl;
      }
    } catch (e) {
      // Asset doesn't exist yet, proceed to generation
    }
  }

  // Layer 3: Neural Synthesis (Nano Banana)
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A high-end cinematic digital illustration for the movie "${title}". 
            Context: ${description.slice(0, 200)}
            Goal: Create a recognizable visual representation of the film's core iconic themes, characters, or props.
            Style: Cyberpunk digital art. Blend identifiable silhouettes or specific movie motifs with subtle glowing circuitry and data-stream overlays. It should look like a "neural memory" of the film.
            Palette: Deep navy/black background (#020617) with vibrant cyan (#00f5ff) and white glowing accents. 
            Avoid text or letters. Ensure the subject matter is clearly recognizable as relating to "${title}".`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "2:3",
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const dataUrl = `data:image/png;base64,${base64Data}`;

          // Layer 4: Persist to Cloud
          if (supabase) {
            const blob = base64ToBlob(base64Data, 'image/png');
            await supabase.storage.from('neural-posters').upload(fileName, blob, {
              contentType: 'image/png',
              upsert: true
            });
            const { data } = supabase.storage.from('neural-posters').getPublicUrl(fileName);
            posterCache[title] = data.publicUrl;
            return data.publicUrl;
          }

          posterCache[title] = dataUrl;
          return dataUrl;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("NEURAL_POSTER_SYNTHESIS_FAILURE:", error);
    return null;
  }
}

/**
 * Converts an image URL to a base64 string.
 */
async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const mimeType = blob.type;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({ data: base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("BASE64_CONVERSION_FAILURE:", error);
    return null;
  }
}

export async function editMoviePoster(imageUrl: string, prompt: string): Promise<string | null> {
  const imageData = await urlToBase64(imageUrl);
  if (!imageData) {
    throw new Error("UNABLE_TO_FETCH_IMAGE_DATA_FOR_SYNTHESIS");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageData.data,
              mimeType: imageData.mimeType,
            },
          },
          {
            text: `Apply this edit to the movie poster: ${prompt}. Maintain the cinematic quality and keep the title legible if possible. Output only the modified image.`,
          },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("NEURAL_EDIT_ENGINE_FAILURE:", error);
    throw error;
  }
}