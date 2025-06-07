// frontend/src/types/Book.ts

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string;
  publishedDate: string;
  pageCount: number;
  categories: string[];
  isbn: string;
  // Additional fields for user's library
  shelf?: 'currentlyReading' | 'recentlyLoved' | 'madeThink' | 'wantToRead';
  addedAt?: Date;
  userNotes?: string;
}

export interface BookSearchResult {
  books: Book[];
}

export interface BookDetailsResult {
  book: Book;
}