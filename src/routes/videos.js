import { createReadStream, statSync } from 'fs';
import path from 'path';
import pool from '../db/config.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/videos';

export default async function videoRoutes(fastify, options) {
  
  // GET /api/v1/my-videos - Listar vídeos do usuário autenticado
  fastify.get('/my-videos', {
    schema: {
      description: 'List all videos for authenticated user',
      tags: ['videos'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          limit: { type: 'integer', default: 50 },
          offset: { type: 'integer', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { userId = 'default-user', limit = 50, offset = 0 } = request.query;

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
