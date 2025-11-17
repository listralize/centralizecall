import { createReadStream, statSync } from 'fs';
import path from 'path';
import pool from '../db/config.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/videos';

export default async function videoRoutes(fastify, options) {
  
  // GET /api/v1/videos/:id - Streaming de vídeo com suporte a range requests
  fastify.get('/videos/:id', {
    schema: {
      description: 'Stream a video by ID',
      tags: ['videos'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      // Buscar metadados do vídeo no banco
      const result = await pool.query(
        'SELECT * FROM videos WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Video not found'
        });
      }

      const video = result.rows[0];
      const videoPath = path.join(UPLOAD_DIR, video.filename);
      const stat = statSync(videoPath);
      const fileSize = stat.size;
      const range = request.headers.range;

      // Incrementar contador de visualizações
      await pool.query(
        'UPDATE videos SET view_count = view_count + 1 WHERE id = $1',
        [id]
      );

      if (range) {
        // Suporte a range requests para streaming progressivo
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = createReadStream(videoPath, { start, end });

        reply.code(206);
        reply.headers({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': video.mime_type || 'video/webm'
        });

        return reply.send(file);
      } else {
        // Enviar vídeo completo
        reply.headers({
          'Content-Length': fileSize,
          'Content-Type': video.mime_type || 'video/webm'
        });

        return reply.send(createReadStream(videoPath));
      }
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to stream video'
      });
    }
  });

  // GET /api/v1/videos/:id/metadata - Obter metadados do vídeo
  fastify.get('/videos/:id/metadata', {
    schema: {
      description: 'Get video metadata',
      tags: ['videos'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      const result = await pool.query(
        `SELECT id, title, description, file_size, mime_type, duration, 
                view_count, created_at, is_public
         FROM videos 
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Video not found'
        });
      }

      return reply.send(result.rows[0]);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get video metadata'
      });
    }
  });

  // GET /api/v1/my-videos - Listar vídeos do usuário autenticado
  fastify.get('/my-videos', {
    schema: {
      description: 'List all videos for authenticated user',
      tags: ['videos'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 50 },
          offset: { type: 'integer', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { limit = 50, offset = 0 } = request.query;
    const userId = 'default-user'; // Usar default-user até implementar autenticação

    try {
      const result = await pool.query(
        `SELECT id, title, description, file_size, mime_type, duration,
                view_count, created_at, is_public
         FROM videos
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM videos WHERE user_id = $1',
        [userId]
      );

      return reply.send({
        videos: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list videos'
      });
    }
  });

  // DELETE /api/v1/videos/:id - Deletar vídeo
  fastify.delete('/videos/:id', {
    schema: {
      description: 'Delete a video',
      tags: ['videos'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = 'default-user'; // Usar default-user até implementar autenticação

    try {
      // Verificar se o vídeo pertence ao usuário
      const result = await pool.query(
        'SELECT filename FROM videos WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Video not found or you do not have permission to delete it'
        });
      }

      const video = result.rows[0];
      const videoPath = path.join(UPLOAD_DIR, video.filename);

      // Deletar arquivo do disco
      await import('fs/promises').then(fs => fs.unlink(videoPath).catch(() => {}));

      // Deletar do banco de dados
      await pool.query('DELETE FROM videos WHERE id = $1', [id]);

      return reply.send({
        message: 'Video deleted successfully'
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete video'
      });
    }
  });
}
