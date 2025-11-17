import pool from '../db/config.js';

export async function authenticateRequest(request, reply) {
  const apiKey = request.headers['x-api-key'] || request.query.api_key;

  if (!apiKey) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'API key is required. Provide it in X-API-Key header or api_key query parameter.'
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE api_key = $1',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid API key.'
      });
    }

    // Adiciona o usuário ao request para uso posterior
    request.user = result.rows[0];
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Failed to authenticate request.'
    });
  }
}
