export default async function debugRoutes(fastify) {
  // Rota de debug - REMOVER EM PRODUÇÃO
  fastify.get('/debug/env', async (request, reply) => {
    const apiKey = process.env.API_KEY;
    
    return {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'undefined',
      allEnvKeys: Object.keys(process.env).filter(k => !k.includes('PASSWORD') && !k.includes('SECRET'))
    };
  });
}
