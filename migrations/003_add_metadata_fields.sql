-- Migration: Adicionar campos de metadata (thumbnail, folder, soap)
-- Data: 2024-11-18
-- Objetivo: Suportar thumbnails, organização em pastas e notas SOAP

-- Adicionar novos campos na tabela videos
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS folder_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS soap_notes TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id_created_at ON videos (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_folder_id ON videos (folder_id);

-- Criar tabela de pastas
CREATE TABLE IF NOT EXISTS folders (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_id VARCHAR(255) REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para folders
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders (user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders (parent_id);

-- Comentários para documentação
COMMENT ON COLUMN videos.thumbnail_url IS 'URL da thumbnail gerada (frame no segundo 1)';
COMMENT ON COLUMN videos.folder_id IS 'ID da pasta onde o vídeo está organizado';
COMMENT ON COLUMN videos.soap_notes IS 'Notas SOAP geradas por IA ou editadas manualmente';
COMMENT ON TABLE folders IS 'Organização hierárquica de vídeos por usuário';
