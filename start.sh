#!/bin/sh
set -e

echo "🔄 Executando migrações do banco de dados..."
node src/db/migrate.js

echo "🚀 Iniciando servidor..."
node src/index.js
