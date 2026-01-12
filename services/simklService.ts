
const SIMKL_CLIENT_ID = process.env.SIMKL_CLIENT_ID;

// Cache map to store IMDB IDs for queries to avoid redundant API calls
const imdbIdCache: Record<string, string | null> = {};

interface SimklSearchResult {
    title: string;
    year?: number;
    ids: {
        simkl?: number;
        simkl_id?: number; // Search results often use simkl_id
        imdb?: string;
        tmdb?: string;
    };
}

/**
 * Fetches the IMDB ID for a given movie title and year using the Simkl API.
 * @param title Movie title
 * @param year Movie year
 * @param type Content type ('movie' or 'series')
 * @returns IMDB ID string (e.g., "tt1375666") or null if not found
 */
export const getImdbId = async (title: string, year?: string | number, type: string = 'movie'): Promise<string | null> => {
    if (!SIMKL_CLIENT_ID) {
        console.warn("SIMKL_CLIENT_ID not configured", process.env);
        return null;
    }

    // Map content type to Simkl path
    const simklType = type === 'series' || type === 'tv' ? 'tv' : 'movie';
    const cacheKey = `${simklType}-${title}-${year}`;

    if (imdbIdCache[cacheKey] !== undefined) {
        return imdbIdCache[cacheKey];
    }

    console.log(`[Simkl] Searching for ${simklType}: ${title} (${year})`);

    try {
        // Step 1: Search using type-specific endpoint
        // Using /search/movie or /search/tv instead of /search/text which returns null frequently
        const searchUrl = `https://api.simkl.com/search/${simklType}?q=${encodeURIComponent(title)}&client_id=${SIMKL_CLIENT_ID}`;
        const searchResponse = await fetch(searchUrl);

        if (!searchResponse.ok) {
            console.warn(`Simkl Search API error: ${searchResponse.status}`);
            return null;
        }

        const searchResults = await searchResponse.json();

        if (!Array.isArray(searchResults) || searchResults.length === 0) {
            console.log(`[Simkl] No results found for: ${title}`);
            imdbIdCache[cacheKey] = null;
            return null;
        }

        // Strategy to find best match in search results
        let bestMatch: SimklSearchResult | null = null;
        const targetYear = year ? (typeof year === 'string' ? parseInt(year) : year) : null;

        if (targetYear) {
            bestMatch = searchResults.find(item => item.year === targetYear) || searchResults[0];
        } else {
            bestMatch = searchResults[0];
        }

        const simklId = bestMatch?.ids?.simkl_id || bestMatch?.ids?.simkl;

        if (!simklId) {
            console.warn(`[Simkl] No Simkl ID found in search result for: ${title}`);
            return null;
        }

        // Step 2: Fetch full summary to get all external IDs (IMDB reliably present here)
        // search results don't always include the IMDB ID in the ids object
        console.log(`[Simkl] Fetching full summary for Simkl ID: ${simklId}`);
        const summaryType = simklType === 'movie' ? 'movies' : 'tv';
        const summaryUrl = `https://api.simkl.com/${summaryType}/${simklId}?extended=full&client_id=${SIMKL_CLIENT_ID}`;
        const summaryResponse = await fetch(summaryUrl);

        if (!summaryResponse.ok) {
            console.warn(`Simkl Summary API error: ${summaryResponse.status}`);
            return null;
        }

        const fullData = await summaryResponse.json();
        const imdbId = fullData?.ids?.imdb || null;

        console.log(`[Simkl] Result for ${title}: ${imdbId}`);
        imdbIdCache[cacheKey] = imdbId;
        return imdbId;

    } catch (error) {
        console.error("Error fetching IMDB ID from Simkl:", error);
        return null;
    }
};
