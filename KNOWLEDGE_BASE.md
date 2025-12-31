# NeuralStream Knowledge Base

This document serves as the primary technical reference for the NeuralStream architecture, data models, and service integrations.

## 🏗️ Architecture Overview

NeuralStream is a client-side heavy React application that leverages AI for both analysis and visual synthesis. It uses a "Hybrid Intelligence" model where Gemini handles metadata and reasoning, while Supabase provides persistence and storage.

### Data Flow
1. **Input**: User imports IMDB CSV or provides natural language queries.
2. **Analysis**: Gemini parses inputs to build a profile of "Neural DNA".
3. **Synthesis**: `getRecommendations` service triggers parallel calls to Gemini for suggestions and `imageService` for poster generation.
4. **Persistence**: `App.tsx` debounces state changes to Supabase (`profiles` table), ensuring a seamless cross-device experience.

## 🧠 Key Services

### `geminiService.ts`
The core logic for recommendation synthesis. 
- **Migration Note**: As of 2025-12-31, the service has completely moved away from TMDB to eliminate API costs.
- **IMDb Search Integration**: Links are now generated as search queries (`https://www.imdb.com/find?q=...`) rather than internal IDs.
- **Integrated Loading**: Poster synthesis (`generateNeuralPoster`) is now awaited in parallel within `getRecommendations` to ensure results are visually complete before display.

### `imageService.ts`
Handles visual synthesis using Gemini's image generation models.
- **Cache-Aside Pattern**: Checks memory cache -> Supabase Storage -> Generates new image.
- **Aesthetic Consistency**: Enforces a strict street-art cyberpunk style via global prompting constraints (No borders, high-contrast palette).

## 📊 Data Models

### `Movie` (Types)
The primary data object used throughout the app.
```typescript
interface Movie {
  id: string;
  title: string;
  year: string;
  rating: number; // Synthesis rating (out of 10)
  type: ContentType; // movie | series
  genres: string[];
  userRating?: number; // Imported from IMDB
  description?: string;
  posterUrl?: string; // Neural data URL or Supabase link
}
```

### `Neural DNA`
Represented by the combination of `userMovies` (history) and `feedbackHistory` (signals).

## 🎨 UI/UX Design System

- **Palette**: Solid black background, neon lime-yellow (#e0f603), vibrant magenta (#ff1388), and electric cyan (#00f5ff).
- **HUD Components**: Modeled after high-tech tactical displays with border beams and grid overlays.
- **Mobile First**: All components use responsive grid layouts and touch-friendly interactive states.

## 🚀 Optimization History (Recent)

- **TMDB Deprecation**: Removed all dependencies on TMDB API for metadata and images to reduce operating costs.
- **Parallel Synthesis**: Moved poster generation to the loading phase to eliminate UI "pop-in".
- **Watchlist Persistence**: Integrated Supabase storage for neural posters, ensuring generated art is saved for the user's future visits.
