# 📚 Guia da API para Frontend

## ✅ Backend está funcionando!

**Base URL:** `https://screen.listralize.com.br`
**API Key:** `KoXMIhDXM0LBnP8PuMXy4x85Wsgwtdn0vzfXQXq0fWk=`

---

## 🎯 Rotas Disponíveis

### 1️⃣ Listar Vídeos (PROTEGIDA)

**Endpoint:** `GET /api/v1/my-videos`
**Autenticação:** Requer API Key no header `X-API-Key`
**Query Parameters:**
- `userId` (opcional): ID do usuário (default: 'default-user')
- `limit` (opcional): Número de vídeos por página (default: 50)
- `offset` (opcional): Offset para paginação (default: 0)

**Exemplo:**
```javascript
const response = await fetch(
  'https://screen.listralize.com.br/api/v1/my-videos?userId=c97cf4b2-213c-4134-a374-b5951fe330f3',
  {
    headers: {
      'X-API-Key': 'KoXMIhDXM0LBnP8PuMXy4x85Wsgwtdn0vzfXQXq0fWk='
    }
  }
);
const data = await response.json();
// Retorna: { videos: [...], total: 8, limit: 50, offset: 0 }
```

**Resposta:**
```json
{
  "videos": [
    {
      "id": "xaUOQOHrLCf29NIcQBKaI",
      "title": "Recording xaUOQOHrLCf29NIcQBKaI",
      "description": null,
      "file_size": "239363",
      "mime_type": "video/webm",
      "duration": null,
      "view_count": 0,
      "created_at": "2025-11-17T15:52:16.854Z",
      "is_public": false
    }
  ],
  "total": 8,
  "limit": 50,
  "offset": 0
}
```

---

### 2️⃣ Upload de Vídeo (PROTEGIDA)

**Endpoint:** `POST /api/v1/upload`
**Autenticação:** Requer API Key no header `X-API-Key`
**Content-Type:** `multipart/form-data`

**Campos do FormData:**
- `video` (obrigatório): Arquivo do vídeo
- `userId` (opcional): ID do usuário
- `title` (opcional): Título do vídeo
- `description` (opcional): Descrição do vídeo

**Exemplo:**
```javascript
const formData = new FormData();
formData.append('video', videoBlob, 'recording.webm');
formData.append('userId', user?.id || 'guest');
formData.append('title', 'Minha gravação');

const response = await fetch(
  'https://screen.listralize.com.br/api/v1/upload',
  {
    method: 'POST',
    headers: {
      'X-API-Key': 'KoXMIhDXM0LBnP8PuMXy4x85Wsgwtdn0vzfXQXq0fWk='
    },
    body: formData
  }
);
const data = await response.json();
```

**Resposta:**
```json
{
  "id": "xaUOQOHrLCf29NIcQBKaI",
  "message": "Video uploaded successfully",
  "url": "https://screen.listralize.com.br/api/v1/videos/xaUOQOHrLCf29NIcQBKaI"
}
```

---

### 3️⃣ Streaming de Vídeo (PÚBLICA)

**Endpoint:** `GET /api/v1/videos/:id`
**Autenticação:** NÃO requer API Key
**Suporte:** Range requests para streaming progressivo

**Exemplo em HTML:**
```html
<video controls>
  <source 
    src="https://screen.listralize.com.br/api/v1/videos/xaUOQOHrLCf29NIcQBKaI" 
    type="video/webm"
  />
</video>
```

**Exemplo em React:**
```jsx
<video controls>
  <source 
    src={`https://screen.listralize.com.br/api/v1/videos/${videoId}`}
    type="video/webm"
  />
</video>
```

---

### 4️⃣ Metadados do Vídeo (PÚBLICA)

**Endpoint:** `GET /api/v1/videos/:id/metadata`
**Autenticação:** NÃO requer API Key

**Exemplo:**
```javascript
const response = await fetch(
  'https://screen.listralize.com.br/api/v1/videos/xaUOQOHrLCf29NIcQBKaI/metadata'
);
const metadata = await response.json();
```

**Resposta:**
```json
{
  "id": "xaUOQOHrLCf29NIcQBKaI",
  "title": "Recording xaUOQOHrLCf29NIcQBKaI",
  "description": null,
  "file_size": "239363",
  "mime_type": "video/webm",
  "duration": null,
  "view_count": 1,
  "created_at": "2025-11-17T15:52:16.854Z",
  "is_public": false
}
```

---

### 5️⃣ Deletar Vídeo (PROTEGIDA)

**Endpoint:** `DELETE /api/v1/videos/:id`
**Autenticação:** Requer API Key no header `X-API-Key`

**Exemplo:**
```javascript
const response = await fetch(
  'https://screen.listralize.com.br/api/v1/videos/xaUOQOHrLCf29NIcQBKaI',
  {
    method: 'DELETE',
    headers: {
      'X-API-Key': 'KoXMIhDXM0LBnP8PuMXy4x85Wsgwtdn0vzfXQXq0fWk='
    }
  }
);
```

---

## ⚠️ Erros Comuns

### Erro 404: Route not found
**Causa:** URL incorreta
**Solução:** Verifique se está usando `/api/v1/` no início da rota

### Erro 401: Unauthorized
**Causa:** API Key faltando ou incorreta
**Solução:** Adicione header `X-API-Key` com o valor correto

### Erro 503: No available server
**Causa:** Container não está rodando
**Solução:** Faça redeploy no Coolify

---

## 🎥 Exemplo Completo - Componente React

```typescript
import { useState, useEffect } from 'react';

const API_URL = 'https://screen.listralize.com.br/api/v1';
const API_KEY = 'KoXMIhDXM0LBnP8PuMXy4x85Wsgwtdn0vzfXQXq0fWk=';

export function VideoLibrary({ user }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, [user]);

  async function loadVideos() {
    try {
      const userId = user?.id || 'guest';
      const response = await fetch(
        `${API_URL}/my-videos?userId=${userId}`,
        {
          headers: { 'X-API-Key': API_KEY }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }
      
      const data = await response.json();
      setVideos(data.videos);
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h2>Meus Vídeos ({videos.length})</h2>
      <div className="grid">
        {videos.map(video => (
          <div key={video.id}>
            <video controls width="320">
              <source 
                src={`${API_URL}/videos/${video.id}`}
                type="video/webm"
              />
            </video>
            <h3>{video.title}</h3>
            <p>{new Date(video.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ Checklist de Integração

- [ ] Usar URL correta: `https://screen.listralize.com.br/api/v1/`
- [ ] Adicionar `/api/v1/` no início de todas as rotas
- [ ] Enviar header `X-API-Key` nas rotas protegidas
- [ ] NÃO enviar API Key nas tags `<video>` (rotas públicas)
- [ ] Passar `userId` do usuário logado
- [ ] Tratar erros 404, 401, 500
- [ ] Permitir permissão de gravação de tela no navegador
