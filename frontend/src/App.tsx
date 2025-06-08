import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import BookSearch from './components/BookSearch';
import { Book } from './types/Book';

interface Message {
  text: string;
  sender: 'user' | 'ai' | 'system';
}

// Dynamic Darcy greeting messages for variety
const DARCY_GREETINGS = [
  "Finally, someone to discuss books with! I'm Darcy. Quick question: are you a 'read until 3am' person or a 'sensible chapters before bed' person? And what's got you hooked right now?",
  
  "Hey there, fellow book lover! I'm Darcy, and I have zero chill when it comes to fictional characters. What's the last book that completely destroyed you emotionally?",
  
  "Oh my gosh, hi! I'm Darcy - your new bookish best friend who will absolutely judge you for dog-earring pages (but in a loving way). What are you reading lately?",
  
  "Welcome to my corner of book chaos! I'm Darcy, and fair warning: I WILL cry about character deaths and I'm not sorry. So, what's on your reading list?",
  
  "Hello, beautiful book human! I'm Darcy, and I'm basically a walking spoiler alert with strong opinions about everything. What's got your attention right now?",
  
  "Hi there! I'm Darcy - part literary critic, part emotional wreck, completely obsessed with good stories. Tell me, what's the last book that kept you up way too late?",
  
  "Hey! I'm Darcy, your resident book enthusiast who definitely has too many TBR lists. Are you team physical books, ebooks, or audiobooks? And what's your current obsession?",
  
  "Oh, a new reading buddy! I'm Darcy, and I promise to get way too invested in whatever you're reading. Seriously, what's the most recent book that made you question your life choices?",
  
  "Hello! I'm Darcy - think of me as that friend who always has book recommendations and strong opinions about adaptations. What brought you here today?",
  
  "Hey there! I'm Darcy, professional book overthinker and amateur relationship counselor for fictional characters. What's been living rent-free in your head lately?",
  
  "Hi! I'm Darcy, and I'm that person who gets genuinely upset when fictional characters make bad decisions. What's the last book that had you yelling at the pages?",
  
  "Oh hello! I'm Darcy - your friendly neighborhood book obsessive who definitely judges people by their bookshelves. What's your current literary guilty pleasure?"
];

// Function to get a random greeting
const getRandomGreeting = () => {
  return DARCY_GREETINGS[Math.floor(Math.random() * DARCY_GREETINGS.length)];
};

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'library'>('chat');
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('darcyMessages');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      // Check for old message and replace with random greeting
      if (parsed.length === 1 && (
        parsed[0].text.includes("Finally, someone to discuss books") || 
        parsed[0].text.includes("Olive Kitteridge") ||
        parsed[0].text.includes("Hey there, fellow book lover") ||
        parsed[0].text.includes("Oh my gosh, hi!")
      )) {
        const freshMessage = [{
          text: getRandomGreeting(),
          sender: 'ai' as const
        }];
        localStorage.setItem('darcyMessages', JSON.stringify(freshMessage));
        return freshMessage;
      }
      return parsed;
    }
    return [{
      text: getRandomGreeting(),
      sender: 'ai'
    }];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load books from localStorage on startup
  const [userBooks, setUserBooks] = useState<Book[]>(() => {
    const savedBooks = localStorage.getItem('darcyBooks');
    if (savedBooks) {
      return JSON.parse(savedBooks);
    }
    // Only use sample books if no saved data exists
    return [
      { 
        id: '1', 
        title: 'KLARA AND THE SUN', 
        author: 'Kazuo Ishiguro', 
        shelf: 'currentlyReading',
        coverUrl: null,
        description: '',
        publishedDate: '',
        pageCount: 0,
        categories: [],
        isbn: ''
      },
      { 
        id: '2', 
        title: 'THE THURSDAY MURDER CLUB', 
        author: 'Richard Osman', 
        shelf: 'currentlyReading',
        coverUrl: null,
        description: '',
        publishedDate: '',
        pageCount: 0,
        categories: [],
        isbn: ''
      }
    ];
  });

  // State for favorite books
  const [favoriteBooks, setFavoriteBooks] = useState<string[]>(() => {
    const savedFavorites = localStorage.getItem('darcyFavorites');
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  });

  // State for book-specific conversations
  const [bookConversations, setBookConversations] = useState<Record<string, Message[]>>(() => {
    const savedConversations = localStorage.getItem('darcyBookConversations');
    return savedConversations ? JSON.parse(savedConversations) : {};
  });

  // State to track current book being discussed
  const [currentBookChat, setCurrentBookChat] = useState<string | null>(null);

  // Save books to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('darcyBooks', JSON.stringify(userBooks));
  }, [userBooks]);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('darcyFavorites', JSON.stringify(favoriteBooks));
  }, [favoriteBooks]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (currentBookChat && messages.length > 0) {
      // Update book conversations without infinite loop
      localStorage.setItem('darcyBookConversations', JSON.stringify({
        ...bookConversations,
        [currentBookChat]: messages
      }));
    } else if (!currentBookChat) {
      // Save general conversation
      localStorage.setItem('darcyMessages', JSON.stringify(messages));
    }
  }, [messages, currentBookChat]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      const menus = document.querySelectorAll('[data-book-menu]');
      menus.forEach(menu => {
        (menu as HTMLElement).style.display = 'none';
      });
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch real book covers for sample books on mount
  useEffect(() => {
    const fetchBookCovers = async () => {
      const booksToUpdate = userBooks.filter(book => !book.coverUrl && book.title);
      
      for (const book of booksToUpdate) {
        try {
          const response = await axios.get(`https://darcy-reading-companion.onrender.com/api/books/search`, {
            params: { query: `${book.title} ${book.author}` }
          });
          
          if (response.data.books && response.data.books.length > 0) {
            const foundBook = response.data.books[0];
            if (foundBook.coverUrl) {
              setUserBooks(prev => prev.map(b => 
                b.id === book.id 
                  ? { ...b, coverUrl: foundBook.coverUrl }
                  : b
              ));
            }
          }
        } catch (error) {
          console.error(`Error fetching cover for ${book.title}:`, error);
        }
      }
    };

    // Only fetch if there are books without covers
    const needsCovers = userBooks.some(book => !book.coverUrl);
    if (needsCovers) {
      // Fetch covers after a short delay to avoid overwhelming the API
      const timer = setTimeout(fetchBookCovers, 1000);
      return () => clearTimeout(timer);
    }
  }, []); // Run once on mount

  // New function to handle book selection from search
  const handleBookSelect = (book: Book, shelf?: any) => {
    const newBook: Book = {
      ...book,
      shelf: shelf || 'currentlyReading',
      addedAt: new Date()
    };
    
    setUserBooks(prev => {
      // Check if book already exists
      const exists = prev.some(b => b.id === book.id);
      if (exists) {
        // Update existing book's shelf
        return prev.map(b => b.id === book.id ? { ...b, shelf: shelf || 'currentlyReading' } : b);
      }
      // Add new book
      return [...prev, newBook];
    });
  };

  // Function to move book to different shelf
  const moveBook = (bookId: string, newShelf: any) => {
    setUserBooks(prev => prev.map(book => 
      book.id === bookId ? { ...book, shelf: newShelf } : book
    ));
  };

  // Function to delete book
  const deleteBook = (bookId: string) => {
    if (window.confirm('Are you sure you want to remove this book from your library?')) {
      setUserBooks(prev => prev.filter(book => book.id !== bookId));
      // Also remove from favorites if it was favorited
      setFavoriteBooks(prev => prev.filter(id => id !== bookId));
    }
  };

  // Function to toggle favorite status
  const toggleFavorite = (bookId: string) => {
    setFavoriteBooks(prev => {
      if (prev.includes(bookId)) {
        // Remove from favorites
        return prev.filter(id => id !== bookId);
      } else if (prev.length < 5) {
        // Add to favorites
        return [...prev, bookId];
      } else {
        // Can't add more
        alert('You can only have 5 favorite books. Remove one to add another!');
        return prev;
      }
    });
  };

  // New function to extract books from chat messages
  const extractBooksFromMessage = async (message: string) => {
    // Simple regex to find book titles in quotes or after "I recommend"
    const bookMentions = message.match(/"([^"]+)"/g) || [];
    
    for (const mention of bookMentions) {
      const bookTitle = mention.replace(/"/g, '');
      try {
        const response = await axios.get(`https://darcy-reading-companion.onrender.com/api/books/search`, {
          params: { query: bookTitle }
        });
        
        if (response.data && response.data.books && response.data.books.length > 0) {
          // Automatically add first result to Darcy Recommended
          handleBookSelect(response.data.books[0], 'darcyRecommended');
        }
      } catch (error) {
        console.error('Error fetching book:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    const newMessages = [...messages, { text: userMessage, sender: 'user' as const }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Send conversation history so AI remembers context
      const response = await axios.post('https://darcy-reading-companion.onrender.com/api/chat', {
        message: userMessage,
        conversationHistory: messages,
        bookContext: currentBookChat ? userBooks.find(b => b.id === currentBookChat) : null
      });

      // Add AI response
      const aiResponse = response.data.response;
      setMessages(prev => [...prev, { 
        text: aiResponse, 
        sender: 'ai' 
      }]);
      
      // Extract and add any mentioned books (only in general chat)
      if (!currentBookChat) {
        await extractBooksFromMessage(aiResponse);
      }
      
      // Optional: Log API usage for debugging
      if (response.data.usage) {
        console.log('OpenAI API usage:', response.data.usage);
      }
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorMessage = "Sorry, I'm having trouble right now. ";
      
      if (error.response?.status === 500) {
        errorMessage += error.response.data.error || "Please check that your backend server is running.";
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage += "Please make sure your backend server is running on port 3001.";
      } else {
        errorMessage += "Please try again in a moment.";
      }
      
      setMessages(prev => [...prev, { 
        text: errorMessage, 
        sender: 'ai' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const openBookChat = (bookId: string) => {
    const book = userBooks.find(b => b.id === bookId);
    if (!book) return;
    
    // Save current general chat if we're switching from it
    if (!currentBookChat && messages.length > 0) {
      localStorage.setItem('darcyMessages', JSON.stringify(messages));
    }
    
    setActiveTab('chat');
    setCurrentBookChat(bookId);
    
    // Check if we have existing conversation for this book
    const existingConversation = bookConversations[bookId];
    
    if (existingConversation && existingConversation.length > 0) {
      // Continue existing conversation
      setMessages(existingConversation);
    } else {
      // Start new conversation about this book
      setMessages([{
        text: `Oh, ${book.title}! I've been waiting to talk about this one. Where are you in it? No spoilers if you're not done, but I would love to know your thoughts so far!`,
        sender: 'ai'
      }]);
    }
  };

  const renderBooksByCategory = (shelfType: any, icon: string, title: string, iconClass: string) => {
    const categoryBooks = userBooks.filter(book => book.shelf === shelfType);
    
    const shelfOptions = [
      { value: 'currentlyReading', label: '📖 Currently Reading' },
      { value: 'recentlyLoved', label: '❤️ Recently Loved' },
      { value: 'madeThink', label: '🧠 Made Me Think' },
      { value: 'wantToRead', label: '📚 Want to Read' },
      { value: 'darcyRecommended', label: '🎯 Darcy Recommended' }
    ].filter(option => option.value !== shelfType);
    
    return (
      <div className="library-section">
        <div className="section-header">
          <div className={`section-icon ${iconClass}`}>{icon}</div>
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="books-grid">
          {categoryBooks.map(book => (
            <div key={book.id} className="book-card" style={{ position: 'relative' }}>
              {/* Updated dropdown menu */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 10
              }}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const bookMenus = document.querySelectorAll(`[data-book-menu]`);
                      bookMenus.forEach(menu => {
                        if (menu.getAttribute('data-book-menu') !== book.id) {
                          (menu as HTMLElement).style.display = 'none';
                        }
                      });
                      const menu = document.querySelector(`[data-book-menu="${book.id}"]`) as HTMLElement;
                      if (menu) {
                        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                      }
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      outline: 'none',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      color: '#6b7280'
                    }}
                  >
                    ⋮
                  </button>
                  
                  <div
                    data-book-menu={book.id}
                    style={{
                      display: 'none',
                      position: 'absolute',
                      top: '28px',
                      right: '0',
                      background: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      zIndex: 20,
                      minWidth: '180px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '4px 0' }}>
                      <div style={{ padding: '0 12px 4px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Move to:</div>
                      {shelfOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBook(book.id, option.value);
                            const menu = document.querySelector(`[data-book-menu="${book.id}"]`) as HTMLElement;
                            if (menu) menu.style.display = 'none';
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: 'none',
                            background: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#374151'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          {option.label}
                        </button>
                      ))}
                      
                      <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(book.id);
                          const menu = document.querySelector(`[data-book-menu="${book.id}"]`) as HTMLElement;
                          if (menu) menu.style.display = 'none';
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#374151'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        {favoriteBooks.includes(book.id) ? '⭐ Remove from Favorites' : '⭐ Add to Favorites'}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBook(book.id);
                          const menu = document.querySelector(`[data-book-menu="${book.id}"]`) as HTMLElement;
                          if (menu) menu.style.display = 'none';
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#dc2626'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        🗑️ Remove from Library
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div onClick={() => openBookChat(book.id)}>
                {book.coverUrl ? (
                  <img 
                    src={book.coverUrl} 
                    alt={book.title}
                    className="book-cover-image"
                    style={{
                      width: '100%',
                      height: '180px',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      // Show the text version instead
                      const parent = target.parentElement;
                      if (parent) {
                        const textDiv = document.createElement('div');
                        textDiv.className = 'book-cover';
                        textDiv.textContent = book.title;
                        parent.appendChild(textDiv);
                      }
                    }}
                  />
                ) : (
                  <div className="book-cover">{book.title}</div>
                )}
                <div className="book-title">{book.title}</div>
                <div className="book-author">{book.author}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Explore</h1>
        <div className="tab-navigation">
          <div 
            className={`tab chat ${activeTab !== 'chat' ? 'inactive' : ''}`}
            onClick={() => {
              setActiveTab('chat');
              // If coming back to chat without clicking a book, show general chat
              if (!currentBookChat) {
                const savedMessages = localStorage.getItem('darcyMessages');
                if (savedMessages) {
                  setMessages(JSON.parse(savedMessages));
                }
              }
            }}
          >
            💬 Chat
          </div>
          <div 
            className={`tab library ${activeTab !== 'library' ? 'inactive' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            📖 My Library
          </div>
        </div>
      </header>

      <main className="content">
        {/* Chat Interface */}
        {activeTab === 'chat' && (
          <div className="chat-container">
            <div className="chat-header">
              <h2>Chat with Darcy</h2>
              <p>Chat with your bookish friend who might get way too emotional about fictional characters...</p>
              {currentBookChat && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '6px 16px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '20px',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}>
                    📖 Discussing: {userBooks.find(b => b.id === currentBookChat)?.title}
                  </div>
                  <br />
                  <button
                    onClick={() => {
                      // Switch back to general chat with random greeting
                      setCurrentBookChat(null);
                      const savedMessages = localStorage.getItem('darcyMessages');
                      if (savedMessages) {
                        setMessages(JSON.parse(savedMessages));
                      } else {
                        setMessages([{
                          text: getRandomGreeting(),
                          sender: 'ai'
                        }]);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                  >
                    ← Back to General Chat
                  </button>
                </div>
              )}
            </div>
            
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.sender}`}>
                  {message.sender === 'ai' && (
                    <div className="ai-avatar" style={{
                      width: '36px',
                      height: '36px',
                      background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)'
                    }}>
                      D
                    </div>
                  )}
                  <div>{message.text}</div>
                </div>
              ))}
              {isLoading && (
                <div className="message ai">
                  <div className="ai-avatar" style={{
                    width: '36px',
                    height: '36px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)'
                  }}>
                    D
                  </div>
                  <div>Thinking...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="chat-input">
              <input 
                type="text" 
                placeholder="Tell me about a book you loved..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <button 
                className="send-button" 
                onClick={sendMessage}
                disabled={isLoading}
              >
                ➤
              </button>
            </div>
          </div>
        )}

        {/* Library Interface */}
        {activeTab === 'library' && (
          <div className="library-container">
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '24px',
              color: '#1f2937'
            }}>
              📚 My Library
            </h1>
            
            {/* Top 5 Favorite Books Section */}
            {favoriteBooks.length > 0 && (
              <div style={{
                marginBottom: '40px',
                padding: '20px',
                background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.1)'
              }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: '#6b21a8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ⭐ My Top {favoriteBooks.length} Favorites
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 120px))',
                  gap: '12px',
                  maxWidth: '100%',
                  justifyContent: 'start'
                }} className="favorites-grid">
                  {favoriteBooks.map(bookId => {
                    const book = userBooks.find(b => b.id === bookId);
                    if (!book) return null;
                    return (
                      <div key={book.id} onClick={() => openBookChat(book.id)} style={{ cursor: 'pointer' }}>
                        {book.coverUrl ? (
                          <img 
                            src={book.coverUrl} 
                            alt={book.title}
                            className="favorite-book-cover"
                            style={{
                              width: '100%',
                              height: '160px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                              transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '160px',
                            background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: '600',
                            textAlign: 'center',
                            padding: '10px',
                            color: '#6b7280'
                          }}>
                            {book.title}
                          </div>
                        )}
                        <div style={{
                          marginTop: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1f2937',
                          lineHeight: '1.2',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>{book.title}</div>
                        <div style={{
                          fontSize: '11px',
                          color: '#6b7280',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{book.author}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Add Book Search here */}
            <BookSearch onBookSelect={handleBookSelect} />
            
            {renderBooksByCategory('currentlyReading', '📖', 'Currently Reading', 'currently-reading')}
            {renderBooksByCategory('recentlyLoved', '❤️', 'Recently Loved', 'recently-loved')}
            {renderBooksByCategory('madeThink', '🧠', 'Made Me Think', 'made-me-think')}
            {renderBooksByCategory('wantToRead', '📚', 'Want to Read', 'want-to-read')}
            {renderBooksByCategory('darcyRecommended', '🎯', 'Darcy Recommended', 'darcy-recommended')}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;