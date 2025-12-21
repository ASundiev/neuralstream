
import { ContentType } from './types';

export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'Film-Noir', 'History',
  'Horror', 'Music', 'Musical', 'Mystery', 'Romance', 'Sci-Fi',
  'Short', 'Sport', 'Thriller', 'War', 'Western'
];

export const MOODS = [
  'Chill', 'Exciting', 'Thought-provoking', 'Dark', 'Romantic',
  'Feel-good', 'Spooky', 'Epic', 'Melancholic', 'Nostalgic'
];

export const CONTENT_TYPES = [
  { value: ContentType.MOVIE, label: 'Movies' },
  { value: ContentType.SERIES, label: 'Series' },
  { value: ContentType.BOTH, label: 'Both' }
];

export const SAMPLE_DATA: any[] = [
  { id: '1', title: 'The Shawshank Redemption', year: '1994', userRating: 9, type: 'movie', genres: ['Drama'] },
  { id: '2', title: 'The Godfather', year: '1972', userRating: 9, type: 'movie', genres: ['Crime', 'Drama'] },
  { id: '3', title: 'The Dark Knight', year: '2008', userRating: 9, type: 'movie', genres: ['Action', 'Crime', 'Drama'] },
  { id: '4', title: 'Breaking Bad', year: '2008', userRating: 10, type: 'series', genres: ['Crime', 'Drama', 'Thriller'] },
  { id: '5', title: 'Stranger Things', year: '2016', userRating: 8, type: 'series', genres: ['Drama', 'Fantasy', 'Horror'] },
  { id: '6', title: 'Inception', year: '2010', userRating: 8, type: 'movie', genres: ['Action', 'Adventure', 'Sci-Fi'] },
  { id: '7', title: 'Interstellar', year: '2014', userRating: 9, type: 'movie', genres: ['Adventure', 'Drama', 'Sci-Fi'] },
  { id: '8', title: 'The Bear', year: '2022', userRating: 9, type: 'series', genres: ['Drama'] },
];
