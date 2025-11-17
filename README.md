# Screen Recorder Backend API

Backend API para sistema de gravação de tela tipo Loom, construído com Node.js e Fastify.

## Funcionalidades

- ✅ Upload de vídeos com suporte a arquivos grandes (até 500MB)
- ✅ Streaming de vídeos com suporte a range requests
- ✅ Autenticação via API Key
- ✅ Armazenamento de metadados em PostgreSQL
- ✅ Gerenciamento de vídeos (listar, deletar)
- ✅ Contador de visualizações
- ✅ CORS configurável
- ✅ Health check endpoint

## Tecnologias

- **Node.js 22** com ES Modules
- **Fastify** - Framework web de alta performance
- **PostgreSQL** - Banco de dados relacional
- **Docker** - Containerização

## Variáveis de Ambiente

```bash
# Banco de dados
DATABASE_URL=postgres://user:password@host:5432/database

# Servidor
PORT=3000
HOST=0.0.0.0
BASE_URL=https://api.seudominio.com

# Upload
UPLOAD_DIR=/data/videos

# CORS
CORS_ORIGIN=*

# Logs
LOG_LEVEL=info
```

## Endpoints da API

### Públicos

- `GET /` - Informações da API
- `GET /health` - Health check

### Autenticados (requerem `X-API-Key` header)

- `POST /api/v1/upload` - Upload de vídeo
- `GET /api/v1/videos/:id` - Stream de vídeo
- `GET /api/v1/videos/:id/metadata` - Metadados do vídeo
- `GET /api/v1/my-videos` - Listar vídeos do usuário
- `DELETE /api/v1/videos/:id` - Deletar vídeo

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar migrações
npm run migrate

# Iniciar servidor em modo desenvolvimento
npm run dev
```

## Deploy com Docker

```bash
# Build da imagem
docker build -t screenrecorder-backend .

# Executar container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgres://..." \
  -e BASE_URL="https://api.seudominio.com" \
  -v /path/to/videos:/data/videos \
  screenrecorder-backend
```

## Deploy no Coolify

O projeto está configurado para deploy automático no Coolify via Git.

1. Conecte o repositório Git ao Coolify
2. Configure as variáveis de ambiente
3. Configure um volume persistente em `/data/videos`
4. Deploy automático a cada push

## Autenticação

A API usa autenticação baseada em API Key. Envie a chave no header:

```
X-API-Key: sua-api-key-aqui
```

Ou como query parameter:

```
?api_key=sua-api-key-aqui
```

## Exemplo de Upload

```bash
curl -X POST https://api.seudominio.com/api/v1/upload \
  -H "X-API-Key: sua-api-key" \
  -F "file=@video.webm" \
  -F "title=Minha Gravação" \
  -F "description=Descrição do vídeo"
```

## Licença

MIT
