#!/bin/bash

echo "🚀 Instalando dependências para o módulo de IA..."

cd "$(dirname "$0")/.."

# Instalar dependências Node.js
echo "📦 Instalando pacotes npm..."
npm install openai@^4.0.0 --save
npm install crypto-js --save

echo "✅ Dependências instaladas com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "1. Configure a variável OPENAI_API_KEY no arquivo .env"
echo "2. Configure a variável ENCRYPTION_KEY no arquivo .env"
echo "3. Execute as migrations: npm run migrate"
echo "4. Reinicie o servidor: npm start"
