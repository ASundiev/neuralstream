
export enum ContentType {
  MOVIE = 'movie',
  SERIES = 'series',
  BOTH = 'both'
}

export interface Feedback {
  type: 'like' | 'dislike';
  reason?: string;
}


export interface Movie {
  id: string;
  title: string;
  year: string;
  rating: number;
  type: ContentType;
  genres: string[];
  userRating?: number;
  description?: string;
  reason?: string;
  posterUrl?: string;
  feedback?: Feedback;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  recommendations: Movie[];
  filters: {
    type: ContentType;
    genre: string;
    mood: string;
    query: string;
  };
}

export interface RecommendationRequest {
  watchedHistory: Movie[];
  feedbackHistory: { title: string, feedback: Feedback }[];
  targetType: ContentType;
  genre?: string;
  mood?: string;
  seedMovie?: Movie;
  naturalLanguageQuery?: string;
  isGuest?: boolean;
  limit?: number;
  excludeTitles?: string[];
}

export interface AppState {
  isLoggedIn: boolean;
  userMovies: Movie[];
  watchlist: Movie[];
  feedbackHistory: { title: string, feedback: Feedback }[];
  searchHistory?: SearchHistoryItem[];
  recommendations: Movie[];
  isLoading: boolean;
  isRecsLoading: boolean;
  isMoreLoading?: boolean;
  filters: {
    type: ContentType;
    genre: string;
    mood: string;
    query: string;
  };
  sources: any[];
  guestSearchUsed: boolean;
}
