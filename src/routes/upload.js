import { nanoid } from 'nanoid';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import pool from '../db/config.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/videos';
const THUMBNAIL_DIR = process.env.THUMBNAIL_DIR || '/data/thumbnails';

export default async function uploadRoutes(fastify, options) {
  // Garantir que os diretórios existem
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(THUMBNAIL_DIR, { recursive: true });

  // POST /api/v1/upload - Upload de vídeo
  fastify.post('/upload', {
    schema: {
      description: 'Upload a screen recording video',
      tags: ['videos'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            url: { type: 'string' },
            watch_url: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const parts = request.parts();
      let videoFile = null;
      let thumbnailFile = null;
      const fields = {};

      // Processar multipart
      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === 'video') {
            videoFile = part;
          } else if (part.fieldname === 'thumbnail') {
            thumbnailFile = part;
          }
        } else {
          fields[part.fieldname] = part.value;
        }
      }

      const data = videoFile;

      if (!data) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No file uploaded. Please send a file in the "file" field.'
        });
      }

      // Validar tipo de arquivo
      const allowedMimeTypes = ['video/webm', 'video/mp4', 'video/quicktime'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
        });
      }

      // Gerar ID único para o vídeo
      const videoId = nanoid();
      const fileExtension = path.extname(data.filename) || '.webm';
      const filename = `${videoId}${fileExtension}`;
      const filePath = path.join(UPLOAD_DIR, filename);

      // Salvar arquivo no disco
      await pipeline(data.file, createWriteStream(filePath));

      // Obter informações do arquivo
      const stats = await import('fs/promises').then(fs => fs.stat(filePath));

      // Extrair metadados dos fields
      const userId = fields.userId || fields.user_id || 'guest';
      const title = fields.title || `Recording ${videoId}`;
      const description = fields.description || null;
      const folderId = fields.folder_id || fields.folderId || null;
      const soapNotes = fields.soap_notes || null;

      // Salvar thumbnail se enviada
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbnailFilename = `${videoId}.jpg`;
        const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);
        await pipeline(thumbnailFile.file, createWriteStream(thumbnailPath));
        thumbnailUrl = `/thumbnails/${thumbnailFilename}`;
      }

      // Salvar metadados no banco de dados
      await pool.query(
        `INSERT INTO videos (id, user_id, filename, original_filename, file_size, mime_type, title, description, thumbnail_url, folder_id, soap_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          videoId,
          userId, // CORRIGIDO: agora pega do FormData
          filename,
          data.filename,
          stats.size,
          data.mimetype,
          title,
          description,
          thumbnailUrl,
          folderId,
          soapNotes
        ]
      );

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      
      return reply.code(200).send({
        id: videoId,
        url: `${baseUrl}/api/v1/videos/${videoId}`,
        watch_url: `${baseUrl}/watch/${videoId}`,
        message: 'Video uploaded successfully'
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to upload video'
      });
    }
  });
}
