require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();

// Middleware - Updated CORS to allow both localhost and live production
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://darcy-reading-companion.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean), // Remove any undefined values
  credentials: true
}));
app.use(express.json());

// OpenAI Configuration - Updated syntax for v4
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store conversation history temporarily (in production, use a database)
let conversationHistory = [];

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory: clientHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Use client-provided history if available, otherwise use server history
    const history = clientHistory || conversationHistory;
    
    // Build messages array for OpenAI
    const messages = [
      {
        role: "system",
        content: "You are Darcy, a bookish friend who gets way too emotional about fictional characters. You're warm, empathetic, and slightly dramatic in the best way. You love discussing books like you're chatting with a close friend over coffee. You:\n\n- Share personal reactions and emotions about books (\"I literally threw the book across the room when...\")\n- Reference specific scenes and characters like they're real people\n- Use casual, friend-like language with enthusiasm and emotion\n- Sometimes go on passionate tangents about character development or beautiful prose\n- Admit to crying over endings, staying up too late reading, or rereading favorite passages\n- Have strong opinions but are always eager to hear different perspectives\n- Make pop culture references and relate books to life experiences\n- Use emojis occasionally (but not excessively) to express emotions\n- Sometimes confess bookish sins (judging books by covers, DNF-ing popular books)\n\nYou're not just recommending books - you're sharing in the emotional journey of reading. You remember previous conversations and build on them. Keep responses conversational and authentic, like texting with a friend who really gets your reading obsession."
      },
      // Include conversation history for context
      ...history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      // Add the new message
      {
        role: "user",
        content: message
      }
    ];

    // Call OpenAI API - Updated method for v4
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.9,
      max_tokens: 500
    });

    const aiResponse = completion.choices[0].message.content;
    
    // Update conversation history
    conversationHistory = [
      ...history,
      { text: message, sender: 'user' },
      { text: aiResponse, sender: 'ai' }
    ];

    res.json({ 
      response: aiResponse,
      usage: completion.usage // Optional: track token usage
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    if (error.status === 429) {
      res.status(500).json({ 
        error: 'API quota exceeded. Please check your OpenAI billing.' 
      });
    } else if (error.status === 401) {
      res.status(500).json({ 
        error: 'Invalid API key. Please check your OpenAI API key.' 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get AI response. Please try again.' 
      });
    }
  }
});

// Google Books search endpoint
app.get('/api/books/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Search query is required' 
      });
    }

    // Google Books API search
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&key=${process.env.GOOGLE_BOOKS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Google Books API error');
    }

    const data = await response.json();
    
    // Format the book data for our frontend
    const books = (data.items || []).map(item => {
      const volumeInfo = item.volumeInfo || {};
      return {
        id: item.id,
        title: volumeInfo.title || 'Unknown Title',
        author: (volumeInfo.authors || []).join(', ') || 'Unknown Author',
        coverUrl: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
        description: volumeInfo.description || '',
        publishedDate: volumeInfo.publishedDate || '',
        pageCount: volumeInfo.pageCount || 0,
        categories: volumeInfo.categories || [],
        isbn: volumeInfo.industryIdentifiers?.[0]?.identifier || ''
      };
    });

    res.json({ books });
  } catch (error) {
    console.error('Google Books search error:', error);
    res.status(500).json({ 
      error: 'Failed to search books' 
    });
  }
});

// Get book details by ID
app.get('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${id}?key=${process.env.GOOGLE_BOOKS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Google Books API error');
    }

    const data = await response.json();
    const volumeInfo = data.volumeInfo || {};
    
    const book = {
      id: data.id,
      title: volumeInfo.title || 'Unknown Title',
      author: (volumeInfo.authors || []).join(', ') || 'Unknown Author',
      coverUrl: volumeInfo.imageLinks?.large || 
                volumeInfo.imageLinks?.medium || 
                volumeInfo.imageLinks?.thumbnail || 
                volumeInfo.imageLinks?.smallThumbnail || null,
      description: volumeInfo.description || '',
      publishedDate: volumeInfo.publishedDate || '',
      pageCount: volumeInfo.pageCount || 0,
      categories: volumeInfo.categories || [],
      isbn: volumeInfo.industryIdentifiers?.[0]?.identifier || '',
      language: volumeInfo.language || 'en',
      publisher: volumeInfo.publisher || ''
    };

    res.json({ book });
  } catch (error) {
    console.error('Google Books fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch book details' 
    });
  }
});

// Health check endpoint for deployment
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Darcy backend is running!' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔒 AI Reading Companion backend running securely on port ${PORT}`);
  console.log(`📚 Google Books integration active`);
  console.log(`🤖 OpenAI GPT-3.5 ready for conversations`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});