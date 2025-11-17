import pool from './config.js';

const createTablesSQL = `
-- Tabela de vídeos (sem dependência de usuários por enquanto)
CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(21) PRIMARY KEY,
  user_id VARCHAR(255) DEFAULT 'default-user',
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  duration INTEGER,
  title VARCHAR(255),
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_is_public ON videos(is_public);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Executando migrações do banco de dados...');
    await client.query(createTablesSQL);
    console.log('✅ Migrações concluídas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
