import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://screenrecorder:DRmUfzH9WXRDxK8KbwgWjnQO8qNIrq4KPOYHA040hW8=@twwso484kocskssc4okk4wwg:5432/screenrecorder'
});

async function runMigration() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    const sql = readFileSync('./migrations/003_add_metadata_fields.sql', 'utf8');
    
    console.log('📝 Executando migration...');
    await pool.query(sql);
    
    console.log('✅ Migration executada com sucesso!');
    
    // Verificar se as colunas foram criadas
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name IN ('user_id', 'thumbnail_url', 'folder_id', 'soap_notes')
    `);
    
    console.log('✅ Colunas encontradas:', result.rows.map(r => r.column_name));
    
    // Verificar se a tabela folders foi criada
    const folderTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'folders'
    `);
    
    if (folderTable.rows.length > 0) {
      console.log('✅ Tabela folders criada com sucesso!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    process.exit(1);
  }
}

runMigration();
