-- Migration: Alterar tipo da coluna user_id de INTEGER para VARCHAR
-- Motivo: Sistema não tem autenticação de usuários ainda, usando identificador string temporário

-- Alterar o tipo da coluna user_id
ALTER TABLE videos 
ALTER COLUMN user_id TYPE VARCHAR(255);

-- Remover a foreign key constraint se existir
ALTER TABLE videos 
DROP CONSTRAINT IF EXISTS videos_user_id_fkey;
