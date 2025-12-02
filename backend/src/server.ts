import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Clean log files on startup
const cleanLogFiles = () => {
  const logFiles = [
    path.join(__dirname, '../backend.log'),
    path.join(__dirname, '../error.log'),
  ];

  logFiles.forEach((file) => {
    try {
      if (fs.existsSync(file)) {
        fs.writeFileSync(file, '');
        console.log(`✓ Cleaned ${path.basename(file)}`);
      }
    } catch (err) {
      console.error(`Failed to clean ${path.basename(file)}:`, err);
    }
  });
};

cleanLogFiles();

import { log } from './utils/logger';

// Services
import { DatabaseSchema } from './database/schema';
import { RedisCache } from './services/redis-cache';
import { ChromaService } from './services/chroma-service';
import { EmbeddingService } from './services/embedding-service';
import { GeminiEmbeddingService } from './services/gemini-embedding-service';
import { CodeIngestionService } from './services/code-ingestion-service';
import { ChatService } from './services/chat-service';
import { GeminiChatService } from './services/gemini-chat-service';
import { AICodeChatService } from './services/AICodeChatService';
import { FileEditService } from './services/FileEditService';
import { RepoSyncService } from './services/RepoSyncService';
import { GitHubOAuthService } from './services/GitHubOAuthService';
import { ProgressiveEditService } from './services/ProgressiveEditService';
import { AICodeEditService } from './services/AICodeEditService';

// Routes
import { createProjectsRouter } from './routes/projects';
import { createIngestRouter } from './routes/ingest';
import { createChatRouter } from './routes/chat';
import { createGitHubRoutes } from './routes/github';
import { createGitHubFileRoutes } from './routes/githubFiles';
import { createAIEditRoutes } from './routes/aiEdit';
import { createProgressiveEditRoutes } from './routes/progressiveEdit';
import { createJobStreamRoutes } from './routes/jobStream';
import { createUsersRouter } from './routes/users';
import { JobWorker } from './services/JobWorker';
// New routes for local projects and custom chat
import { createLocalProjectRoutes } from './routes/localProjects';
import { createLocalIngestRoutes } from './routes/localIngest';
import { createCustomChatRoutes } from './routes/customChat';
import { createElectronAuthRoutes } from './routes/electronAuth';

// Configuration
const PORT = parseInt(process.env.PORT || '3000');
const DATABASE_PATH = process.env.DATABASE_PATH || './data/code-chat.db';

// Initialize services
log.info('Initializing services...');

// Database
const db = new DatabaseSchema(DATABASE_PATH);
log.info('✓ Database initialized');

// Redis (optional - server can run without it)
let redis: RedisCache | null = null;
try {
  redis = new RedisCache({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    prefix: process.env.CACHE_PREFIX || 'code-chat',
    ttl: parseInt(process.env.CACHE_TTL || '86400'),
  });
  log.info('✓ Redis cache initialized');
} catch (err) {
  log.warn('⚠️  Redis not available. Cache will be disabled. Server will continue without Redis.');
  log.warn(`   Error: ${(err as Error).message}`);
  log.warn('   Set REDIS_HOST and REDIS_PORT to enable caching.');
}

// ChromaDB
const chroma = new ChromaService({
  host: process.env.CHROMA_HOST || 'localhost',
  port: parseInt(process.env.CHROMA_PORT || '8000'),
});
log.info('✓ ChromaDB service initialized');

// AI Provider Configuration
const aiProvider = process.env.AI_PROVIDER || 'gemini';

// Initialize services based on provider
let embeddings: EmbeddingService | GeminiEmbeddingService;
let chatService: ChatService | GeminiChatService;

if (aiProvider === 'gemini') {
  // Gemini (Google) - FREE!
  log.info('Using Google Gemini for embeddings and chat');

  const geminiEmbeddings = new GeminiEmbeddingService({
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    dimension: parseInt(process.env.EMBEDDING_DIMENSION || '768'),
  });
  embeddings = geminiEmbeddings;
  log.info('✓ Gemini embedding service initialized');

  chatService = new GeminiChatService(
    db,
    chroma,
    geminiEmbeddings,
    {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash-exp',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '8192'),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
    }
  );
  log.info('✓ Gemini chat service initialized');
} else {
  // OpenAI
  log.info('Using OpenAI for embeddings and chat');

  const openaiEmbeddings = new EmbeddingService({
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    dimension: parseInt(process.env.EMBEDDING_DIMENSION || '1536'),
  });
  embeddings = openaiEmbeddings;
  log.info('✓ OpenAI embedding service initialized');

  chatService = new ChatService(
    db,
    chroma,
    openaiEmbeddings,
    {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4-turbo-preview',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096'),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
    }
  );
  log.info('✓ OpenAI chat service initialized');
}

// Code ingestion
const ingestionService = new CodeIngestionService(
  db,
  redis, // Can be null - service handles it gracefully
  chroma,
  embeddings
);
log.info('✓ Ingestion service initialized');

// File ingestion service (processes cloned repos)
const { FileIngestionService } = require('./services/FileIngestionService');
const fileIngestionService = new FileIngestionService(db, ingestionService);
log.info('✓ File ingestion service initialized');

// GitHub and file editing services
const githubAuth = new GitHubOAuthService(db);
if (!githubAuth.isConfigured()) {
  log.warn('⚠️  GitHub OAuth not configured. GitHub integration features will be disabled.');
  log.warn('   Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL to enable.');
} else {
  log.info('✓ GitHub OAuth service initialized');
}
const fileEditService = new FileEditService(db);
const repoSyncService = new RepoSyncService(db, githubAuth, fileIngestionService);

// AI Code Chat Service (for code editing with LLM)
let aiCodeChatService: AICodeChatService | null = null;
let progressiveEditService: ProgressiveEditService | null = null;

if (aiProvider === 'gemini') {
  const geminiEmbeddings = embeddings as GeminiEmbeddingService;

  aiCodeChatService = new AICodeChatService(
    db,
    chroma,
    geminiEmbeddings,
    fileEditService,
    repoSyncService,
    githubAuth,
    
  );
  log.info('✓ AI Code Chat service initialized');

  // Progressive Edit Service
  const aiCodeEditService = new AICodeEditService(db, fileEditService, repoSyncService);
  progressiveEditService = new ProgressiveEditService(
    db,
    chroma,
    geminiEmbeddings,
    aiCodeEditService,
    fileEditService,
    githubAuth,
    {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '8192'),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
    }
  );
  log.info('✓ Progressive Edit service initialized');

  // Job Worker (processes queue in background)
  const jobWorker = new JobWorker(
    db,
    chroma,
    geminiEmbeddings,
    aiCodeEditService,
    {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash-exp',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '8192'),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
    }
  );
  log.info('✓ Job Worker initialized');
}

// Create Express app
const app = express();

// Security middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin:  '*',
  credentials: true,
}));



app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  log.http(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    let redisHealth = false;
    if (redis) {
      try {
        redisHealth = await redis.ping();
      } catch (err) {
        redisHealth = false;
      }
    }
    
    const chromaHealth = await chroma.healthCheck();

    const health = {
      status: chromaHealth ? 'healthy' : 'unhealthy', // Redis is optional
      timestamp: Date.now(),
      services: {
        redis: redis ? (redisHealth ? 'up' : 'down') : 'disabled',
        chroma: chromaHealth ? 'up' : 'down',
        database: 'up',
      },
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: (err as Error).message,
    });
  }
});

// Stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const dbStats = db.getDb();

    const projectCount = (dbStats.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;
    const fileCount = (dbStats.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number }).count;
    const chunkCount = (dbStats.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number }).count;

    let redisStats = null;
    if (redis) {
      try {
        redisStats = await redis.getStats();
      } catch (err) {
        redisStats = { error: 'Redis unavailable' };
      }
    }

    res.json({
      database: {
        projects: projectCount,
        files: fileCount,
        chunks: chunkCount,
      },
      cache: redisStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats', details: (err as Error).message });
  }
});

// API Routes
app.use('/api/users', createUsersRouter(db));
app.use('/api/projects', createProjectsRouter(db, chroma, ingestionService));
app.use('/api/ingest', createIngestRouter(ingestionService, db));
app.use('/api/chat', createChatRouter(chatService, db));

// GitHub integration routes
app.use('/api/github', createGitHubRoutes(db, fileIngestionService));
app.use('/api/projects', createGitHubFileRoutes(db));

// AI Code Editor routes
if (aiCodeChatService) {
  app.use('/api/ai', createAIEditRoutes(db, aiCodeChatService));
  log.info('✓ AI Code Editor routes registered');
}

// Progressive Edit routes
if (progressiveEditService) {
  app.use('/api/ai/edit', createProgressiveEditRoutes(db, progressiveEditService));
  log.info('✓ Progressive Edit routes registered');
}

// Job Stream routes (SSE for real-time job progress)
app.use('/api/jobs', createJobStreamRoutes(db));
log.info('✓ Job Stream routes registered');

// Local project routes (for opening local folders)
app.use('/api/local-projects', createLocalProjectRoutes(db));
app.use('/api/local-ingest', createLocalIngestRoutes(db, fileIngestionService));
log.info('✓ Local project routes registered');


const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY || 'pk_test_dG91Z2gtbW9ua2Zpc2gtNTMuY2xlcmsuYWNjb3VudHMuZGV2JA';
app.use('/auth', createElectronAuthRoutes(clerkPublishableKey));
log.info('✓ Electron auth routes registered');
// Custom chat routes (using backend LLM)
if (aiCodeChatService) {
  app.use('/api/custom-chat', createCustomChatRoutes(db, aiCodeChatService));
  log.info('✓ Custom chat routes registered');
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  log.info(`\n🚀 Code Chat Backend running on http://localhost:${PORT}`);
  log.info(`📊 Stats: http://localhost:${PORT}/stats`);
  log.info(`❤️  Health: http://localhost:${PORT}/health`);
  log.info(`\nEnvironment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.info('\nSIGTERM received, shutting down gracefully...');
  if (redis) {
    try {
      await redis.close();
    } catch (err) {
      log.error('Error closing Redis:', err);
    }
  }
  db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  log.info('\nSIGINT received, shutting down gracefully...');
  if (redis) {
    try {
      await redis.close();
    } catch (err) {
      log.error('Error closing Redis:', err);
    }
  }
  db.close();
  process.exit(0);
});
