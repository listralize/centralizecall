export async function authenticateRequest(request, reply) {
  const apiKey = request.headers['x-api-key'] || request.query.api_key;
  const validApiKey = process.env.API_KEY;

  if (!apiKey) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'API key is required. Provide it in X-API-Key header or api_key query parameter.'
    });
  }

  if (apiKey !== validApiKey) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key.'
    });
  }

  // Adiciona um usuário padrão ao request
  request.user = {
    id: 'default-user',
    email: 'user@listralize.com'
  };
}
