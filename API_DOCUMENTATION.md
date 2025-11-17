# Documentação da API - Screen Recorder

Esta documentação detalha como integrar o backend do Screen Recorder com o seu frontend no Lovable.

## 1. Visão Geral

- **URL Base**: `https://screen.listralize.com.br`
- **Autenticação**: API Key (a ser gerada)

## 2. Endpoints

### 2.1. Upload de Vídeo

- **Endpoint**: `POST /api/upload`
- **Descrição**: Envia um vídeo gravado para o servidor.
- **Headers**:
  - `Authorization`: `Bearer <SUA_API_KEY>`
- **Body**: `multipart/form-data`
  - `video`: O arquivo de vídeo gravado (ex: `video.webm`)

**Exemplo de Requisição (JavaScript)**:

```javascript
const uploadVideo = async (videoBlob) => {
  const formData = new FormData();
  formData.append("video", videoBlob, "recording.webm");

  try {
    const response = await fetch("https://screen.listralize.com.br/api/upload", {
      method: "POST",
      headers: {
        "Authorization": "Bearer <SUA_API_KEY>"
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Upload successful:", result);
    return result;
  } catch (error) {
    console.error("Error uploading video:", error);
  }
};
```

### 2.2. Listar Vídeos

- **Endpoint**: `GET /api/videos`
- **Descrição**: Retorna uma lista de todos os vídeos gravados.
- **Headers**:
  - `Authorization`: `Bearer <SUA_API_KEY>`

**Exemplo de Requisição (JavaScript)**:

```javascript
const listVideos = async () => {
  try {
    const response = await fetch("https://screen.listralize.com.br/api/videos", {
      headers: {
        "Authorization": "Bearer <SUA_API_KEY>"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const videos = await response.json();
    console.log("Videos:", videos);
    return videos;
  } catch (error) {
    console.error("Error listing videos:", error);
  }
};
```

## 3. Próximos Passos

1. **Gerar uma API Key segura** para autenticação.
2. **Criar um componente React** no Lovable que use a API do navegador para gravar a tela e, ao finalizar, chame a função `uploadVideo`.
3. **Criar uma página** no Lovable que chame a função `listVideos` e exiba os vídeos gravados.

---
*Documento gerado por Manus AI.*
