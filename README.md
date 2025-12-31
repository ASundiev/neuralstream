<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# NeuralStream AI

**NeuralStream** is a high-end, cyberpunk-aesthetic movie and series recommendation engine. It goes beyond simple filters by analyzing your personal "Neural DNA"—a composite of your IMDB ratings, feedback signals, and search history—to synthesize ultra-personalized recommendations.

## 🚀 Key Features

- **Neural DNA Analysis**: Automatically builds a taste matrix from your imported IMDB ratings (7+) and real-time feedback.
- **AI-Synthesized Posters**: Every recommendation features a unique, neural-generated poster synthesized by Gemini, following a strict cyberpunk street-art aesthetic.
- **IMDb Integration**: Seamlessly navigate to IMDB for detailed movie information via free search-result linking.
- **Dynamic Watchlist**: Save your synthesized recommendations to a persistent watchlist, complete with saved neural posters.
- **Cyberpunk HUD**: A premium, high-contrast interface featuring:
  - **Neural DNA Progress**: Animated visualization of your profile's depth.
  - **Border Beam Animations**: High-tech feedback on interactive elements.
  - **Glitch Hover Effects**: Retro-future visual artifacts on movie posters.
- **Mobile Optimized**: A fully responsive experience with tailored layouts for mobile viewports.

## 🛠️ Technology Stack

- **Core**: React, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Intelligence**: Google Gemini (Pro, Flash, and Image models)
- **Backend & Storage**: Supabase (Auth, DB, and Storage for neural posters)

## 📖 Run Locally

**Prerequisites:** Node.js, Supabase account, and Gemini API Key.

1. **Clone & Install**:
   ```bash
   npm install
   ```
2. **Environment Configuration**:
   Create a `.env.local` file and set the following variables:
   - `API_KEY`: Your Google Gemini API Key.
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
3. **Launch**:
   ```bash
   npm run dev
   ```

---

*NeuralStream: Synchronizing your taste with the digital void.*
