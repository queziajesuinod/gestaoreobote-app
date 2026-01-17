# 📋 Documentação das Rotas da API - Módulo de Inadimplentes

Base URL: `/api/inadimplentes`

---

## 🔓 Rotas Públicas (Sem Autenticação)

### Webhook Callback

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/webhook/callback` | Receber callback do sistema externo |

**Payload:**
```json
{
  "cobranca_id": "uuid",
  "sucesso": true,
  "mensagem_id": "msg-123",
  "mensagem": "Notificação enviada com sucesso"
}
```

**Headers:**
- `X-Webhook-Signature`: Assinatura HMAC SHA256

---

## 🔒 Rotas Protegidas (Requerem Autenticação JWT)

### Processos de Cobrança

| Método | Rota | Descrição | Query/Body |
|--------|------|-----------|------------|
| GET | `/processos` | Listar processos | `?status=ativo&cotaId=uuid` |
| POST | `/processos` | Criar processo | `{ cotaId, diaVencimento, dataInicioCobranca, valorParcela, historicoRetroativo, observacao }` |
| GET | `/processos/:id` | Buscar processo | - |
| PUT | `/processos/:id` | Atualizar processo | `{ diaVencimento, valorParcela, observacao }` |
| DELETE | `/processos/:id` | Excluir processo | - |
| POST | `/processos/:id/pausar` | Pausar processo | - |
| POST | `/processos/:id/reativar` | Reativar processo | - |
| POST | `/processos/:id/encerrar` | Encerrar processo | - |

---

### Cobranças Mensais

| Método | Rota | Descrição | Query/Body |
|--------|------|-----------|------------|
| GET | `/cobrancas` | Listar cobranças | `?status=atrasado&dataInicio=2026-01-01&dataFim=2026-01-31&processoCobrancaId=uuid` |
| GET | `/cobrancas/:id` | Buscar cobrança | - |
| POST | `/cobrancas/:id/pagar` | Marcar como pago | `{ dataPagamento, observacao }` |
| POST | `/cobrancas/:id/notificacoes` | Adicionar anotação | `{ tipo, canal, mensagem }` |
| POST | `/cobrancas/:id/notificar` | Forçar notificação | - |
| GET | `/cobrancas/estatisticas` | Estatísticas | - |

---

### Inadimplência

| Método | Rota | Descrição | Query/Body |
|--------|------|-----------|------------|
| GET | `/inadimplentes` | Listar inadimplentes | `?diasAtrasoMin=7&diasAtrasoMax=30` |
| GET | `/inadimplentes/:id` | Detalhes do inadimplente | - |
| GET | `/dashboard` | Dashboard | - |
| POST | `/detectar` | Detectar inadimplência | - |

---

### Webhooks

| Método | Rota | Descrição | Query/Body |
|--------|------|-----------|------------|
| GET | `/webhooks/logs` | Listar logs | `?tipo=saida&sucesso=true&cobrancaMensalId=uuid&limit=100` |
| GET | `/webhooks/logs/:id` | Buscar log | - |
| GET | `/webhooks/estatisticas` | Estatísticas | - |

---

### Configurações de Webhook

| Método | Rota | Descrição | Query/Body |
|--------|------|-----------|------------|
| GET | `/configuracoes/webhook` | Listar configurações | - |
| POST | `/configuracoes/webhook` | Criar configuração | `{ nome, url, metodo, headers, secretKey, ativo, maxTentativas, timeout }` |
| GET | `/configuracoes/webhook/ativa` | Obter ativa | - |
| GET | `/configuracoes/webhook/:id` | Buscar configuração | - |
| PUT | `/configuracoes/webhook/:id` | Atualizar | `{ nome, url, metodo, headers, secretKey, ativo, maxTentativas, timeout }` |
| DELETE | `/configuracoes/webhook/:id` | Excluir | - |
| POST | `/configuracoes/webhook/:id/ativar` | Ativar | - |
| POST | `/configuracoes/webhook/:id/desativar` | Desativar | - |

---

## 📊 Total de Rotas

- **Processos de Cobrança:** 8 rotas
- **Cobranças Mensais:** 6 rotas
- **Inadimplência:** 4 rotas
- **Webhooks:** 3 rotas
- **Configurações de Webhook:** 9 rotas
- **Webhook Callback (público):** 1 rota

**Total:** 31 rotas

---

## 🔐 Autenticação

Todas as rotas protegidas requerem token JWT no header:

```http
Authorization: Bearer <token>
```

A rota `/webhook/callback` é pública e não requer autenticação, mas valida a assinatura HMAC.

---

## 📝 Exemplos de Requisições

### 1. Criar Processo com Histórico

```http
POST /api/inadimplentes/processos
Authorization: Bearer <token>
Content-Type: application/json

{
  "cotaId": "uuid-da-cota",
  "diaVencimento": 10,
  "dataInicioCobranca": "2026-01-01",
  "valorParcela": 500.00,
  "historicoRetroativo": {
    "primeiroMesPago": "2024-01-01",
    "quantidadeMeses": 12
  },
  "observacao": "Cliente VIP"
}
```

### 2. Listar Inadimplentes

```http
GET /api/inadimplentes/inadimplentes?diasAtrasoMin=7&diasAtrasoMax=30
Authorization: Bearer <token>
```

### 3. Marcar Como Pago

```http
POST /api/inadimplentes/cobrancas/:id/pagar
Authorization: Bearer <token>
Content-Type: application/json

{
  "dataPagamento": "2026-01-15",
  "observacao": "Pago via PIX"
}
```

### 4. Adicionar Anotação

```http
POST /api/inadimplentes/cobrancas/:id/notificacoes
Authorization: Bearer <token>
Content-Type: application/json

{
  "tipo": "manual",
  "canal": "whatsapp_manual",
  "mensagem": "Cliente confirmou pagamento para amanhã"
}
```

### 5. Callback do Sistema Externo

```http
POST /api/inadimplentes/webhook/callback
X-Webhook-Signature: abc123...
Content-Type: application/json

{
  "cobranca_id": "uuid",
  "sucesso": true,
  "mensagem_id": "msg-123",
  "mensagem": "Notificação enviada com sucesso"
}
```

---

## ⚠️ Ordem Importante das Rotas

Algumas rotas devem vir **ANTES** de rotas com parâmetros dinâmicos para evitar conflitos:

1. `/cobrancas/estatisticas` **ANTES DE** `/cobrancas/:id`
2. `/dashboard` **ANTES DE** `/inadimplentes/:id`
3. `/webhooks/estatisticas` **ANTES DE** `/webhooks/logs/:id`
4. `/configuracoes/webhook/ativa` **ANTES DE** `/configuracoes/webhook/:id`

Isso já está implementado corretamente no arquivo de rotas.

---

## 🎯 Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 404 | Não encontrado |
| 500 | Erro interno do servidor |

---

## 📦 Formato de Resposta Padrão

### Sucesso:
```json
{
  "sucesso": true,
  "mensagem": "Operação realizada com sucesso",
  "dados": { ... }
}
```

### Erro:
```json
{
  "sucesso": false,
  "mensagem": "Descrição do erro"
}
```
