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
                view_count, created_at, is_public, thumbnail_url, folder_id, soap_notes, user_id
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

  // PATCH /api/v1/videos/:id - Editar metadados do vídeo
  fastify.patch('/videos/:id', {
    schema: {
      description: 'Update video metadata',
      tags: ['videos'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          folder_id: { type: 'string' },
          soap_notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { title, description, folder_id, soap_notes } = request.body;
    const userId = request.query.userId || 'guest';

    try {
      // Verificar se o vídeo pertence ao usuário
      const checkResult = await pool.query(
        'SELECT id FROM videos WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (checkResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Video not found or you do not have permission to edit it'
        });
      }

      // Construir query dinâmica
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (folder_id !== undefined) {
        updates.push(`folder_id = $${paramIndex++}`);
        values.push(folder_id);
      }
      if (soap_notes !== undefined) {
        updates.push(`soap_notes = $${paramIndex++}`);
        values.push(soap_notes);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No fields to update'
        });
      }

      values.push(id);
      const query = `UPDATE videos SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

      await pool.query(query, values);

      // Retornar vídeo atualizado
      const result = await pool.query(
        'SELECT * FROM videos WHERE id = $1',
        [id]
      );

      return reply.send({
        message: 'Video updated successfully',
        video: result.rows[0]
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update video'
      });
    }
  });

  // GET /api/v1/videos/:id/thumbnail - Servir thumbnail
  fastify.get('/videos/:id/thumbnail', {
    schema: {
      description: 'Get video thumbnail',
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
        'SELECT thumbnail_url FROM videos WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Video not found'
        });
      }

      const video = result.rows[0];
      
      if (!video.thumbnail_url) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Thumbnail not available'
        });
      }

      const thumbnailPath = path.join(UPLOAD_DIR, '../thumbnails', path.basename(video.thumbnail_url));
      
      // Verificar se arquivo existe
      try {
        statSync(thumbnailPath);
      } catch {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Thumbnail file not found'
        });
      }

      return reply
        .type('image/jpeg')
        .header('Cache-Control', 'public, max-age=31536000')
        .send(createReadStream(thumbnailPath));
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get thumbnail'
      });
    }
  });

  // GET /api/v1/videos/:id/metadata - Buscar metadados completos
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
        'SELECT * FROM videos WHERE id = $1',
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
        message: 'Failed to get metadata'
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
