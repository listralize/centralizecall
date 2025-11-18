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

  // POST /api/v1/upload - Upload de vídeo (SIMPLIFICADO)
  fastify.post('/upload', {
    schema: {
      description: 'Upload a video file',
      tags: ['upload'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            message: { type: 'string' },
            url: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('📥 Upload iniciado...');
      
      // Pegar apenas o primeiro arquivo (vídeo)
      const data = await request.file();

      if (!data) {
        console.error('❌ Nenhum arquivo enviado');
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No file uploaded'
        });
      }

      console.log('📹 Arquivo recebido:', data.filename, data.mimetype);

      // Validar tipo de arquivo
      const allowedMimeTypes = ['video/webm', 'video/mp4', 'video/quicktime'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        console.error('❌ Tipo de arquivo inválido:', data.mimetype);
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Invalid file type: ${data.mimetype}`
        });
      }

      // Gerar ID único
      const videoId = nanoid();
      const fileExtension = path.extname(data.filename) || '.webm';
      const filename = `${videoId}${fileExtension}`;
      const filePath = path.join(UPLOAD_DIR, filename);

      console.log('💾 Salvando arquivo:', filePath);

      // Salvar arquivo
      await pipeline(data.file, createWriteStream(filePath));

      // Obter tamanho do arquivo
      const stats = await import('fs/promises').then(fs => fs.stat(filePath));
      console.log('✅ Arquivo salvo:', stats.size, 'bytes');

      // Extrair metadados dos fields
      const fields = data.fields || {};
      const userId = fields.userId?.value || fields.user_id?.value || 'guest';
      const title = fields.title?.value || `Recording ${videoId}`;
      const description = fields.description?.value || null;
      const folderId = fields.folder_id?.value || fields.folderId?.value || null;
      const soapNotes = fields.soap_notes?.value || null;

      console.log('👤 User ID:', userId);
      console.log('📝 Title:', title);

      // Salvar no banco
      await pool.query(
        `INSERT INTO videos (id, user_id, filename, original_filename, file_size, mime_type, title, description, folder_id, soap_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          videoId,
          userId,
          filename,
          data.filename,
          stats.size,
          data.mimetype,
          title,
          description,
          folderId,
          soapNotes
        ]
      );

      console.log('✅ Vídeo salvo no banco:', videoId);

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

      return reply.send({
        id: videoId,
        message: 'Video uploaded successfully',
        url: `${baseUrl}/api/v1/videos/${videoId}`,
        size: stats.size,
        filename: filename
      });

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      console.error('Stack:', error.stack);
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Failed to upload video'
      });
    }
  });
}
