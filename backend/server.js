require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');
const analyticsRoutes = require('./routes/analytics');
const Database = require('./database/db');

const app = express();
const PORT = process.env.PORT || 9000;

// Trust proxy for Railway/production deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

// Initialize database
const db = new Database();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));

// CORS configuration for Vercel frontend
const corsOptions = {
  origin: process.env.CORS_ORIGIN || [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app',
    /\.vercel\.app$/  // Allow all Vercel domains
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - 60 requests per minute per user
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: {
      code: "RATE_LIMIT",
      message: "Too many requests, please try again later."
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', healthRoutes);

// Well-known endpoint
app.get('/.well-known/hackathon.json', (req, res) => {
  res.json({
    name: "HelpDesk Mini",
    description: "Ticketing system with SLA timers, role-based access, and threaded comments",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      meta: "/api/_meta",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login"
      },
      tickets: {
        list: "GET /api/tickets",
        create: "POST /api/tickets",
        get: "GET /api/tickets/:id",
        update: "PATCH /api/tickets/:id",
        comment: "POST /api/tickets/:id/comments"
      }
    },
    features: [
      "SLA timers",
      "Role-based access (user, agent, admin)",
      "Threaded comments",
      "Pagination",
      "Idempotency",
      "Rate limiting",
      "Search functionality"
    ]
  });
});

// API-only routes - no frontend serving
app.get('/', (req, res) => {
  res.json({
    message: "HelpDesk Mini API Server",
    status: "running",
    environment: process.env.NODE_ENV || 'development',
    frontend: "Frontend is deployed separately on Vercel",
    endpoints: {
      health: "/api/health",
      documentation: "/api/_meta",
      hackathon: "/.well-known/hackathon.json"
    }
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "API endpoint not found"
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong!"
    }
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.initialize();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`HelpDesk Mini server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`API documentation: http://localhost:${PORT}/api/_meta`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;