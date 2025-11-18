import { nanoid } from 'nanoid';
import path from 'path';
import pool from '../db/config.js';
import { trimVideo, generateThumbnail, getVideoDuration } from '../services/videoProcessor.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/videos';
const THUMBNAIL_DIR = process.env.THUMBNAIL_DIR || '/data/thumbnails';

export default async function trimRoutes(fastify, options) {
  
  // POST /api/v1/videos/:id/trim - Cortar vídeo
  fastify.post('/videos/:id/trim', {
    schema: {
      description: 'Trim/cut a video',
      tags: ['videos'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          startTime: { type: 'number', description: 'Start time in seconds' },
          endTime: { type: 'number', description: 'End time in seconds' },
          replaceOriginal: { type: 'boolean', default: false }
        },
        required: ['startTime', 'endTime']
      },
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { startTime, endTime, replaceOriginal = false } = request.body;
    const userId = request.query.userId || 'guest';

    try {
      console.log(`✂️  Cortando vídeo ${id}: ${startTime}s - ${endTime}s`);

      // Validar tempos
      if (startTime < 0 || endTime <= startTime) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid start/end times'
        });
      }

      // Buscar vídeo original
      const videoResult = await pool.query(
        'SELECT * FROM videos WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (videoResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Video not found or you do not have permission'
        });
      }

      const originalVideo = videoResult.rows[0];
      const originalPath = path.join(UPLOAD_DIR, originalVideo.filename);

      // Verificar se endTime não excede duração
      if (originalVideo.duration && endTime > originalVideo.duration) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `End time (${endTime}s) exceeds video duration (${originalVideo.duration}s)`
        });
      }

      // Gerar novo ID e filename
      const newVideoId = replaceOriginal ? id : nanoid();
      const fileExtension = path.extname(originalVideo.filename);
      const newFilename = `${newVideoId}${fileExtension}`;
      const newVideoPath = path.join(UPLOAD_DIR, newFilename);

      // Cortar vídeo
      await trimVideo(originalPath, newVideoPath, startTime, endTime);

      // Gerar nova thumbnail
      let thumbnailUrl = null;
      try {
        const thumbnailFilename = `${newVideoId}.jpg`;
        const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);
        
        const thumbnailGenerated = await generateThumbnail(newVideoPath, thumbnailPath);
        
        if (thumbnailGenerated) {
          thumbnailUrl = `/thumbnails/${thumbnailFilename}`;
        }
      } catch (thumbError) {
        console.error('⚠️  Erro ao gerar thumbnail do vídeo cortado:', thumbError);
      }

      // Obter duração do novo vídeo
      const newDuration = await getVideoDuration(newVideoPath);

      // Obter tamanho do arquivo
      const stats = await import('fs/promises').then(fs => fs.stat(newVideoPath));

      if (replaceOriginal) {
        // Atualizar vídeo existente
        await pool.query(
          `UPDATE videos 
           SET filename = $1, file_size = $2, duration = $3, thumbnail_url = $4, updated_at = NOW()
           WHERE id = $5`,
          [newFilename, stats.size.toString(), newDuration, thumbnailUrl, id]
        );

        console.log(`✅ Vídeo ${id} substituído com versão cortada`);

        return reply.send({
          message: 'Video trimmed and replaced successfully',
          video: {
            id,
            duration: newDuration,
            file_size: stats.size,
            thumbnail_url: thumbnailUrl
          }
        });
      } else {
        // Criar novo vídeo
        const newTitle = `${originalVideo.title} (cortado ${startTime}s-${endTime}s)`;
        
        await pool.query(
          `INSERT INTO videos (id, user_id, filename, original_filename, file_size, mime_type, title, description, folder_id, soap_notes, thumbnail_url, duration)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            newVideoId,
            userId,
            newFilename,
            originalVideo.original_filename,
            stats.size.toString(),
            originalVideo.mime_type,
            newTitle,
            originalVideo.description,
            originalVideo.folder_id,
            originalVideo.soap_notes,
            thumbnailUrl,
            newDuration
          ]
        );

        console.log(`✅ Novo vídeo criado: ${newVideoId}`);

        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

        return reply.send({
          message: 'Video trimmed successfully',
          video: {
            id: newVideoId,
            title: newTitle,
            duration: newDuration,
            file_size: stats.size,
            thumbnail_url: thumbnailUrl,
            url: `${baseUrl}/api/v1/videos/${newVideoId}`
          }
        });
      }

    } catch (error) {
      console.error('❌ Erro ao cortar vídeo:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Failed to trim video'
      });
    }
  });
}
