
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
            text: `A raw, minimalist street-art movie poster for "${title}". 
            Style: Aggressive stencil-style cyberpunk. Use thick, heavy black ink outlines and broad, expressive spray-paint strokes. 
            Composition: FULL BLEED edge-to-edge artwork. Extremely focused on a single, powerful central character or iconic silhouette. 
            Palette: High-contrast blocks of neon lime-yellow (#e0f603) and vibrant magenta (#ff1388) against deep, solid black. Use electric cyan (#00f5ff) only for sharp, minimal highlights or digital accents.
            Graphic Elements: Integrate vertical bars, large graphic blocks of color, and abstract symbols that look like futuristic kanji or hazard warnings. 
            Texture: Distressed ink splatters, rough brush edges, and subtle halftone patterns to create a hand-crafted, raw street-art feel.
            Subject: A stylized, iconic representation of the main theme from "${title}".
            CRITICAL CONSTRAINTS: NO BORDERS, NO FRAMES, NO WHITE MARGINS, NO OUTER OUTLINES, NO PADDING. The artwork must bleed off the edges of the image. No legible credits or small text.`,
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
            text: `Modify this movie poster: ${prompt}. Maintain the minimalist stencil-style, rough street-art aesthetic, and the high-contrast yellow/magenta/cyan palette. Ensure NO BORDERS or FRAMES are added.`,
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
