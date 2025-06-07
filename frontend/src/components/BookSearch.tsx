// frontend/src/components/BookSearch.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { Book } from '../types/Book';

interface BookSearchProps {
  onBookSelect: (book: Book, shelf: Book['shelf']) => void;
}

const BookSearch: React.FC<BookSearchProps> = ({ onBookSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<Book['shelf']>('currentlyReading');

  const searchBooks = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await axios.get(`https://darcy-reading-companion.onrender.com/api/books/search`, {
        params: { query: searchQuery }
      });
      setSearchResults(response.data.books);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchBooks();
    }
  };

  const selectBook = (book: Book) => {
    onBookSelect(book, selectedShelf);
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const shelfOptions = [
    { value: 'currentlyReading', label: '📖 Currently Reading' },
    { value: 'recentlyLoved', label: '❤️ Recently Loved' },
    { value: 'madeThink', label: '🧠 Made Me Think' },
    { value: 'wantToRead', label: '📚 Want to Read' },
    { value: 'darcyRecommended', label: '🎯 Darcy Recommended' }
  ];

  return (
    <div className="book-search-container" style={{ position: 'relative', marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <select
          value={selectedShelf}
          onChange={(e) => setSelectedShelf(e.target.value as Book['shelf'])}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            fontSize: '16px',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '200px'
          }}
        >
          {shelfOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Search for a book..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#a855f7'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />
        <button
          onClick={searchBooks}
          disabled={isSearching}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isSearching ? 'not-allowed' : 'pointer',
            opacity: isSearching ? 0.7 : 1,
            transition: 'all 0.2s'
          }}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {showResults && searchResults.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '10px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 100
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f3f4f6',
            background: '#f9fafb',
            borderRadius: '12px 12px 0 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Click a book to add it to "{shelfOptions.find(o => o.value === selectedShelf)?.label}"
          </div>
          {searchResults.map((book) => (
            <div
              key={book.id}
              onClick={() => selectBook(book)}
              style={{
                display: 'flex',
                padding: '16px',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              {book.coverUrl && (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  style={{
                    width: '50px',
                    height: '75px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    marginRight: '16px'
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '4px',
                  color: '#1f2937'
                }}>
                  {book.title}
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  by {book.author}
                </p>
                {book.description && (
                  <p style={{ 
                    fontSize: '13px', 
                    color: '#9ca3af',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {book.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && searchResults.length === 0 && !isSearching && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '10px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No books found. Try a different search term.
        </div>
      )}
    </div>
  );
};

export default BookSearch;