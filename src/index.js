import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { authenticateRequest } from './middleware/auth.js';
import uploadRoutes from './routes/upload.js';
import videoRoutes from './routes/videos.js';
import folderRoutes from './routes/folders.js';
import publicRoutes from './routes/public.js';
import debugRoutes from './routes/debug.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  },
  bodyLimit: 1024 * 1024 * 500, // 500MB max file size
  requestTimeout: 300000 // 5 minutos
});

// Registrar plugins
await fastify.register(cors, {
  origin: true, // Permitir todas as origens
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
});

await fastify.register(multipart, {
  limits: {
    fileSize: 1024 * 1024 * 500, // 500MB
    files: 1
  }
});

// Health check (sem autenticação)
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Rota raiz com informações da API
fastify.get('/', async (request, reply) => {
  return {
    name: 'Screen Recorder API',
    version: '1.0.0',
    description: 'Backend API for screen recording system (Loom-like)',
    endpoints: {
      health: '/health',
      upload: 'POST /api/v1/upload (auth required)',
      stream: 'GET /api/v1/videos/:id (public)',
      metadata: 'GET /api/v1/videos/:id/metadata (public)',
      myVideos: 'GET /api/v1/my-videos (auth required)',
      delete: 'DELETE /api/v1/videos/:id (auth required)'
    },
    authentication: 'API Key required in X-API-Key header for protected routes'
  };
});

// Registrar rotas públicas (sem autenticação)
await fastify.register(publicRoutes, { prefix: '/api/v1' });

// Registrar rotas de debug (REMOVER EM PRODUÇÃO)
await fastify.register(debugRoutes, { prefix: '/api/v1' });

// Registrar rotas com autenticação
await fastify.register(async function (fastify) {
  // Aplicar middleware de autenticação em todas as rotas deste escopo
  fastify.addHook('preHandler', authenticateRequest);
  
  // Registrar rotas
  await fastify.register(uploadRoutes, { prefix: '/api/v1' });
  await fastify.register(videoRoutes, { prefix: '/api/v1' });
  await fastify.register(folderRoutes, { prefix: '/api/v1' });
});

// Tratamento de erros global
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  
  if (error.statusCode) {
    reply.code(error.statusCode).send({
      error: error.name,
      message: error.message
    });
  } else {
    reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

// Iniciar servidor
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(`🚀 Server running at http://${host}:${port}`);
    fastify.log.info(`📚 API documentation available at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
