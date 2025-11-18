import { nanoid } from 'nanoid';
import pool from '../db/config.js';

export default async function folderRoutes(fastify, options) {
  
  // GET /api/v1/folders - Listar pastas do usuário
  fastify.get('/folders', {
    schema: {
      description: 'List all folders for a user',
      tags: ['folders'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      }
    }
  }, async (request, reply) => {
    const { userId } = request.query;

    try {
      const result = await pool.query(
        `SELECT id, user_id, name, parent_id, created_at, updated_at
         FROM folders
         WHERE user_id = $1
         ORDER BY name ASC`,
        [userId]
      );

      return reply.send({
        folders: result.rows
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list folders'
      });
    }
  });

  // POST /api/v1/folders - Criar pasta
  fastify.post('/folders', {
    schema: {
      description: 'Create a new folder',
      tags: ['folders'],
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          name: { type: 'string' },
          parentId: { type: 'string' }
        },
        required: ['userId', 'name']
      }
    }
  }, async (request, reply) => {
    const { userId, name, parentId } = request.body;

    try {
      const folderId = nanoid();

      const result = await pool.query(
        `INSERT INTO folders (id, user_id, name, parent_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [folderId, userId, name, parentId || null]
      );

      return reply.code(201).send(result.rows[0]);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create folder'
      });
    }
  });

  // PATCH /api/v1/folders/:id - Atualizar pasta
  fastify.patch('/folders/:id', {
    schema: {
      description: 'Update folder name or parent',
      tags: ['folders'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          parentId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { name, parentId } = request.body;

    try {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (parentId !== undefined) {
        updates.push(`parent_id = $${paramIndex++}`);
        values.push(parentId);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);
      const query = `UPDATE folders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Folder not found'
        });
      }

      return reply.send(result.rows[0]);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update folder'
      });
    }
  });

  // DELETE /api/v1/folders/:id - Deletar pasta
  fastify.delete('/folders/:id', {
    schema: {
      description: 'Delete a folder (videos inside will have folder_id set to NULL)',
      tags: ['folders'],
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
      // Setar folder_id dos vídeos para NULL
      await pool.query(
        'UPDATE videos SET folder_id = NULL WHERE folder_id = $1',
        [id]
      );

      // Deletar pasta
      const result = await pool.query(
        'DELETE FROM folders WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Folder not found'
        });
      }

      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete folder'
      });
    }
  });
}
