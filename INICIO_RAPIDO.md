# 🚀 INÍCIO RÁPIDO - Sistema de Temperatura de Leads

## ⚡ 3 Passos para Começar

### **1️⃣ Instalar Dependências (2 minutos)**

```bash
cd ~/gestaoreobote-app
./scripts/instalar-dependencias.sh
```

### **2️⃣ Configurar Variáveis de Ambiente (1 minuto)**

Edite o arquivo `.env` e adicione:

```env
# OpenAI (obrigatório)
OPENAI_API_KEY=sk-proj-...

# Criptografia (obrigatório)
ENCRYPTION_KEY=minha_chave_secreta_de_32_chars

# URL pública do servidor (para webhook)
REACT_APP_API_URL=https://seu-dominio.com
```

### **3️⃣ Executar Migrations (1 minuto)**

```bash
cd server
npx sequelize-cli db:migrate
```

### **4️⃣ Reiniciar o Servidor**

```bash
npm start
```

---

## ✅ Pronto!

Agora você pode:

1. **Conectar WhatsApp:**
   - POST `/evolution/configurar`
   - Enviar: `{ instanceName, apiUrl, apiKey }`

2. **Importar Chats:**
   - POST `/evolution/importar`

3. **Ver Leads:**
   - GET `/leads/1` (substitua 1 pelo ID do consultor)

4. **Ver Temperatura:**
   - Cada lead terá um campo `temperaturaLead` de 0 a 100

---

## 🔥 Exemplo de Resposta

```json
{
  "sucesso": true,
  "leads": [
    {
      "id": "uuid-123",
      "nome": "João Silva",
      "telefone": "11999887766",
      "temperaturaLead": 85,
      "sentimentoGeral": "positivo",
      "status": "qualificado",
      "ultimaMensagem": "2025-12-29T10:30:00Z"
    }
  ],
  "agrupados": {
    "quentes": [...],  // 70-100
    "mornos": [...],   // 40-69
    "frios": [...]     // 0-39
  }
}
```

---

## 📖 Documentação Completa

- `RESUMO_IMPLEMENTACAO.md` - Visão geral completa
- `ALGORITMO_TEMPERATURA_DETALHADO.md` - Como funciona o algoritmo
- `EXEMPLOS_TEMPERATURA_PRATICOS.md` - Casos de teste e exemplos

---

**Dúvidas?** Consulte os documentos acima! 🎯
