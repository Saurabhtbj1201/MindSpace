const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables FIRST
dotenv.config();

// Debug environment variables
console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT || 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('GOOGLE_AI_API_KEY exists:', !!process.env.GOOGLE_AI_API_KEY);
console.log('GOOGLE_AI_API_KEY length:', process.env.GOOGLE_AI_API_KEY ? process.env.GOOGLE_AI_API_KEY.length : 0);

const authRoutes = require('./routes/authRoutes');
const moodRoutes = require('./routes/moodRoutes');
const profileRoutes = require('./routes/profileRoutes');
const settingRoutes = require('./routes/settingRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(express.json());

// Configure CORS to allow requests from multiple frontend origins
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests from these origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:5500',
      'https://mind-space-beryl.vercel.app'  // Your production Vercel URL
    ];
    
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS - Origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Use the CORS middleware with options
app.use(cors(corsOptions));

// Configure MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tlsAllowInvalidCertificates: false,
  retryWrites: true,
  w: 'majority',
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000
};

// Connect to MongoDB with improved error handling
mongoose.connect(process.env.MONGODB_URI, mongoOptions)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.error('Connection details:', {
      uri: process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Log URI with hidden credentials
      options: mongoOptions
    });
    
    // Don't crash the server, but notify about the connection issue
    console.error('Server will continue running, but MongoDB operations will fail');
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/user/profile', profileRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/ai', aiRoutes);

// Config endpoint to serve environment URLs to frontend
app.get('/api/config', (req, res) => {
  res.status(200).json({
    success: true,
    config: {
      backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:5001',
      mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:5000/predict_emotion'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    database: dbStatus,
    aiEnabled: !!process.env.GOOGLE_AI_API_KEY
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    status: 'error', 
    message: err.message || 'Something went wrong on the server' 
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
