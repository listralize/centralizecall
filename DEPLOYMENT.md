# Guia de Deployment e Configuração - Screen Recorder

Este guia detalha os passos para fazer o deploy do backend do Screen Recorder no Coolify, configurar a aplicação e preparar o ambiente para a integração com a extensão do Chrome.

## 1. Visão Geral da Arquitetura

- **Backend**: API Node.js com Fastify para upload e streaming de vídeos.
- **Banco de Dados**: PostgreSQL 16 para armazenar metadados dos vídeos.
- **Armazenamento**: Volume persistente no Coolify para os arquivos de vídeo.
- **Deploy**: Coolify com build a partir de um repositório GitHub.
- **Domínio**: `screen.listralize.com.br` (a ser configurado).

## 2. Informações da Infraestrutura

| Recurso | Detalhes |
|---|---|
| **Projeto Coolify** | `Screen Recorder` (UUID: `qss8wkw80k8c4cssw0sssook`) |
| **Aplicação Coolify** | `screenrecorder-api` (UUID: `fks48wgogocscgc4wgw44kog`) |
| **Banco de Dados** | `screenrecorder-db` (PostgreSQL 16) |
| **URL Interna do BD** | `postgres://screenrecorder:DRmUfzH9WXRDxK8KbwgWjnQO8qNIrq4KPOYHA040hW8=@twwso484kocskssc4okk4wwg:5432/screenrecorder` |
| **Repositório GitHub** | `https://github.com/listralize/centralizecall` |
| **Domínio Final** | `https://screen.listralize.com.br` |

## 3. Passos para Deployment Manual no Coolify

1. **Acesse sua instância do Coolify** em `https://sistema.listralize.com.br`.
2. **Navegue até o projeto `Screen Recorder`**.
3. **Selecione a aplicação `screenrecorder-api`**.
4. **Configure o Domínio**:
   - Na aba "General", adicione `screen.listralize.com.br` no campo "Domains".
   - Salve as alterações.
5. **Configure as Variáveis de Ambiente**:
   - Na aba "Environment Variables", adicione a seguinte variável:
     - **Key**: `DATABASE_URL`
     - **Value**: `postgres://screenrecorder:DRmUfzH9WXRDxK8KbwgWjnQO8qNIrq4KPOYHA040hW8=@twwso484kocskssc4okk4wwg:5432/screenrecorder`
   - Salve as alterações.
6. **Configure o Armazenamento**:
   - Na aba "Storage", adicione um novo volume:
     - **Host Path**: `/data/videos`
     - **Container Path**: `/data/videos`
   - Salve as alterações.
7. **Faça o Deploy**:
   - Clique no botão "Deploy" para iniciar o processo de build e deploy.

## 4. Próximos Passos

Após o deploy bem-sucedido, a API estará disponível em `https://screen.listralize.com.br`. O próximo passo será modificar a extensão Screenity para se comunicar com esta API.

---
*Documento gerado por Manus AI.
