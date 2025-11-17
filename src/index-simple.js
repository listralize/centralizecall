const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs').promises;

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/videos';

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log(`Upload directory ready: ${UPLOAD_DIR}`);
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return { 
    message: 'Screen Recorder API', 
    version: '1.0.0',
    endpoints: {
      health: '/health',
      upload: 'POST /api/upload',
      videos: 'GET /api/videos'
    }
  };
});

// Start server
const start = async () => {
  try {
    await ensureUploadDir();
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
