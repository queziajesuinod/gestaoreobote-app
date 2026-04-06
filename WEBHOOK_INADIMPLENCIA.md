# 🔔 Sistema de Webhook de Inadimplência

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Como Funciona](#como-funciona)
3. [Configuração](#configuração)
4. [Estrutura do Payload](#estrutura-do-payload)
5. [Segurança](#segurança)
6. [Validação de Assinatura](#validação-de-assinatura)
7. [Exemplos de Implementação](#exemplos-de-implementação)
8. [Tratamento de Erros](#tratamento-de-erros)
9. [Logs e Monitoramento](#logs-e-monitoramento)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O **Sistema de Webhook de Inadimplência** permite que sistemas externos sejam notificados automaticamente quando:

- ✅ Uma nova inadimplência é detectada
- ✅ Uma cobrança fica atrasada
- ✅ Um cliente entra em inadimplência
- ✅ Uma cobrança é marcada como paga

### **Benefícios:**

- 🔄 **Integração em tempo real** com sistemas externos
- 🔐 **Segurança** com assinatura HMAC SHA-256
- 🔁 **Retry automático** em caso de falha (até 4 tentativas)
- 📊 **Logs completos** de todas as notificações
- ⚙️ **Configuração simples** via interface web

---

## 🔄 Como Funciona

### **Fluxo Completo:**

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA REOBOTE                          │
│                                                             │
│  1. Detecção de Inadimplência                              │
│     ↓                                                       │
│  2. Cron Job (diário às 00:00)                             │
│     ↓                                                       │
│  3. Identifica cobranças atrasadas                         │
│     ↓                                                       │
│  4. Para cada cobrança atrasada:                           │
│     ├─ Cria registro no banco                              │
│     ├─ Prepara payload JSON                                │
│     ├─ Gera assinatura HMAC SHA-256                        │
│     └─ Envia POST para URL configurada                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SEU SISTEMA                              │
│                                                             │
│  1. Recebe POST na URL configurada                         │
│     ↓                                                       │
│  2. Valida assinatura HMAC                                 │
│     ↓                                                       │
│  3. Processa dados da inadimplência                        │
│     ↓                                                       │
│  4. Retorna HTTP 200 (sucesso)                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    RETRY (se falhar)                        │
│                                                             │
│  - Tentativa 1: Imediata                                   │
│  - Tentativa 2: Após 5 minutos                             │
│  - Tentativa 3: Após 15 minutos                            │
│  - Tentativa 4: Após 1 hora                                │
│                                                             │
│  Se todas falharem → Log de erro permanente                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuração

### **Passo 1: Acessar Configurações**

1. Faça login no sistema
2. Navegue para: **Inadimplentes** → **Configurações Webhook**
3. Você verá a tela de configuração

### **Passo 2: Preencher Dados**

| Campo | Descrição | Exemplo | Obrigatório |
|-------|-----------|---------|-------------|
| **URL do Webhook** | URL completa do seu endpoint | `https://seu-sistema.com/api/webhooks/inadimplencia` | ✅ Sim |
| **Secret Key** | Chave secreta para assinatura (mín. 16 caracteres) | `minha-chave-super-secreta-123456` | ✅ Sim |

### **Passo 3: Gerar Secret Key**

**Opção A: Gerar Automaticamente**
- Clique no botão **"Gerar"** ao lado do campo Secret Key
- Uma chave de 32 caracteres será gerada automaticamente
- **IMPORTANTE:** Copie e guarde esta chave em local seguro!

**Opção B: Criar Manualmente**
- Digite uma chave com no mínimo 16 caracteres
- Recomendado: Use letras, números e caracteres especiais
- Exemplo: `MyS3cr3tK3y!2026@Webhook#`

### **Passo 4: Salvar**

- Clique em **"Salvar Configuração"**
- Aguarde a mensagem de sucesso
- A configuração será ativada automaticamente

### **Passo 5: Testar (Opcional)**

- Clique em **"Testar Webhook"**
- Um webhook de teste será enviado
- Verifique os logs abaixo para confirmar o envio

---

## 📦 Estrutura do Payload

### **Headers HTTP:**

```http
POST /api/webhooks/inadimplencia HTTP/1.1
Host: seu-sistema.com
Content-Type: application/json
X-Webhook-Signature: sha256=abc123def456...
X-Webhook-Event: inadimplencia.detectada
X-Webhook-ID: 550e8400-e29b-41d4-a716-446655440000
X-Webhook-Timestamp: 2026-01-19T12:00:00.000Z
```

### **Body JSON:**

```json
{
  "evento": "inadimplencia.detectada",
  "timestamp": "2026-01-19T12:00:00.000Z",
  "dados": {
    "cobranca": {
      "id": "abc123",
      "mesReferencia": "2026-01",
      "dataVencimento": "2026-01-10",
      "valor": 35000,
      "status": "atrasado",
      "diasAtraso": 9
    },
    "processo": {
      "id": "def456",
      "status": "ativo",
      "dataInicioCobranca": "2025-10-01",
      "diaVencimento": 10
    },
    "cota": {
      "id": "ghi789",
      "numero": "111",
      "digito": "1",
      "grupo": "1",
      "valor": 350000,
      "valorTotal": 400000,
      "administradora": "SERVOPA"
    },
    "cliente": {
      "id": "jkl012",
      "nome": "CLIENTE TESTE",
      "cpf": "02909218139",
      "telefone": "(11) 98765-4321",
      "email": "cliente@exemplo.com"
    },
    "consultor": {
      "id": 1,
      "nome": "Raphael Oliveira",
      "email": "raphael@reobote.com"
    }
  }
}
```

### **Campos Detalhados:**

#### **Evento:**
- `inadimplencia.detectada` - Nova inadimplência identificada
- `cobranca.atrasada` - Cobrança ficou atrasada
- `cobranca.paga` - Cobrança foi paga (resolve inadimplência)

#### **Cobrança:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String | ID único da cobrança |
| `mesReferencia` | String | Mês de referência (YYYY-MM) |
| `dataVencimento` | Date | Data de vencimento |
| `valor` | Number | Valor em centavos (35000 = R$ 350,00) |
| `status` | String | `pendente`, `atrasado`, `pago` |
| `diasAtraso` | Number | Dias de atraso (0 se não atrasado) |

#### **Processo:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String | ID do processo de cobrança |
| `status` | String | `ativo`, `pausado`, `encerrado` |
| `dataInicioCobranca` | Date | Data de início das cobranças |
| `diaVencimento` | Number | Dia do mês para vencimento (1-31) |

#### **Cota:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `numero` | String | Número da cota |
| `digito` | String | Dígito verificador |
| `grupo` | String | Número do grupo |
| `valor` | Number | Valor da cota em centavos |
| `valorTotal` | Number | Valor total em centavos |
| `administradora` | String | Nome da administradora |

#### **Cliente:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nome` | String | Nome completo |
| `cpf` | String | CPF (apenas números) |
| `telefone` | String | Telefone formatado |
| `email` | String | Email de contato |

#### **Consultor:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Number | ID do consultor |
| `nome` | String | Nome do consultor |
| `email` | String | Email do consultor |

---

## 🔐 Segurança

### **Assinatura HMAC SHA-256**

Cada webhook é assinado digitalmente usando **HMAC SHA-256** para garantir:

1. ✅ **Autenticidade** - Confirma que o webhook veio do sistema Reobote
2. ✅ **Integridade** - Garante que os dados não foram alterados
3. ✅ **Segurança** - Previne ataques de replay e falsificação

### **Como Funciona:**

```
1. Sistema Reobote:
   - Serializa o payload JSON
   - Gera HMAC usando SHA-256 e sua Secret Key
   - Envia assinatura no header X-Webhook-Signature

2. Seu Sistema:
   - Recebe o webhook
   - Gera HMAC do payload usando a mesma Secret Key
   - Compara com a assinatura recebida
   - Se igual → Webhook válido ✅
   - Se diferente → Webhook inválido ❌ (rejeitar)
```

---

## ✅ Validação de Assinatura

### **Node.js (Express):**

```javascript
const crypto = require('crypto');
const express = require('express');
const app = express();

// Middleware para validar webhook
function validarWebhook(req, res, next) {
  const SECRET_KEY = 'sua-secret-key-aqui'; // Mesma configurada no sistema
  const assinaturaRecebida = req.headers['x-webhook-signature'];
  
  if (!assinaturaRecebida) {
    return res.status(401).json({ erro: 'Assinatura ausente' });
  }
  
  // Gerar HMAC do payload
  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(payload);
  const assinaturaCalculada = 'sha256=' + hmac.digest('hex');
  
  // Comparar assinaturas (timing-safe)
  if (!crypto.timingSafeEqual(
    Buffer.from(assinaturaRecebida),
    Buffer.from(assinaturaCalculada)
  )) {
    return res.status(401).json({ erro: 'Assinatura inválida' });
  }
  
  next();
}

// Rota do webhook
app.post('/api/webhooks/inadimplencia', 
  express.json(),
  validarWebhook,
  (req, res) => {
    const { evento, dados } = req.body;
    
    console.log('Webhook recebido:', evento);
    console.log('Cliente:', dados.cliente.nome);
    console.log('Dias de atraso:', dados.cobranca.diasAtraso);
    
    // Processar dados...
    
    res.status(200).json({ sucesso: true });
  }
);
```

### **Python (Flask):**

```python
import hmac
import hashlib
import json
from flask import Flask, request, jsonify

app = Flask(__name__)
SECRET_KEY = 'sua-secret-key-aqui'  # Mesma configurada no sistema

def validar_webhook():
    assinatura_recebida = request.headers.get('X-Webhook-Signature')
    
    if not assinatura_recebida:
        return False, 'Assinatura ausente'
    
    # Gerar HMAC do payload
    payload = request.get_data()
    hmac_obj = hmac.new(
        SECRET_KEY.encode('utf-8'),
        payload,
        hashlib.sha256
    )
    assinatura_calculada = 'sha256=' + hmac_obj.hexdigest()
    
    # Comparar assinaturas (timing-safe)
    if not hmac.compare_digest(assinatura_recebida, assinatura_calculada):
        return False, 'Assinatura inválida'
    
    return True, None

@app.route('/api/webhooks/inadimplencia', methods=['POST'])
def webhook_inadimplencia():
    # Validar assinatura
    valido, erro = validar_webhook()
    if not valido:
        return jsonify({'erro': erro}), 401
    
    # Processar webhook
    dados = request.json
    evento = dados['evento']
    cliente = dados['dados']['cliente']
    cobranca = dados['dados']['cobranca']
    
    print(f'Webhook recebido: {evento}')
    print(f'Cliente: {cliente["nome"]}')
    print(f'Dias de atraso: {cobranca["diasAtraso"]}')
    
    # Processar dados...
    
    return jsonify({'sucesso': True}), 200
```

### **PHP:**

```php
<?php
$SECRET_KEY = 'sua-secret-key-aqui'; // Mesma configurada no sistema

// Receber webhook
$payload = file_get_contents('php://input');
$assinaturaRecebida = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';

if (empty($assinaturaRecebida)) {
    http_response_code(401);
    echo json_encode(['erro' => 'Assinatura ausente']);
    exit;
}

// Gerar HMAC do payload
$assinaturaCalculada = 'sha256=' . hash_hmac('sha256', $payload, $SECRET_KEY);

// Comparar assinaturas (timing-safe)
if (!hash_equals($assinaturaRecebida, $assinaturaCalculada)) {
    http_response_code(401);
    echo json_encode(['erro' => 'Assinatura inválida']);
    exit;
}

// Processar webhook
$dados = json_decode($payload, true);
$evento = $dados['evento'];
$cliente = $dados['dados']['cliente'];
$cobranca = $dados['dados']['cobranca'];

error_log("Webhook recebido: $evento");
error_log("Cliente: " . $cliente['nome']);
error_log("Dias de atraso: " . $cobranca['diasAtraso']);

// Processar dados...

http_response_code(200);
echo json_encode(['sucesso' => true]);
?>
```

---

## 🔄 Tratamento de Erros

### **Códigos HTTP Esperados:**

| Código | Significado | Ação do Sistema |
|--------|-------------|-----------------|
| **200** | Sucesso | Marca como entregue ✅ |
| **201** | Criado | Marca como entregue ✅ |
| **400** | Erro no payload | Não tenta novamente ❌ |
| **401** | Não autorizado | Não tenta novamente ❌ |
| **403** | Proibido | Não tenta novamente ❌ |
| **404** | URL não encontrada | Tenta novamente 🔁 |
| **500** | Erro no servidor | Tenta novamente 🔁 |
| **502** | Bad Gateway | Tenta novamente 🔁 |
| **503** | Serviço indisponível | Tenta novamente 🔁 |
| **504** | Timeout | Tenta novamente 🔁 |

### **Política de Retry:**

```
Tentativa 1: Imediata
Tentativa 2: Após 5 minutos
Tentativa 3: Após 15 minutos
Tentativa 4: Após 1 hora

Total de tentativas: 4
Tempo máximo: ~1h15min
```

### **Timeout:**

- **Padrão:** 30 segundos
- **Configurável:** Pode ser ajustado na configuração

### **Seu Sistema Deve:**

1. ✅ **Responder rapidamente** (< 30 segundos)
2. ✅ **Retornar 200** em caso de sucesso
3. ✅ **Processar de forma assíncrona** se necessário
4. ✅ **Validar a assinatura** antes de processar
5. ✅ **Logar erros** para troubleshooting

---

## 📊 Logs e Monitoramento

### **Visualizar Logs:**

1. Acesse: **Inadimplentes** → **Configurações Webhook**
2. Role até a seção **"Histórico de Webhooks"**
3. Você verá uma tabela com:
   - ID do webhook
   - Evento
   - Status (Sucesso, Falha, Pendente)
   - Data/Hora
   - Tentativas
   - Ações (Reenviar)

### **Estatísticas:**

No topo da página, você verá:

- **Total de Webhooks:** Quantidade total enviada
- **Sucesso:** Webhooks entregues com sucesso
- **Falha:** Webhooks que falharam após 4 tentativas
- **Pendente:** Webhooks aguardando retry

### **Reenviar Webhook:**

Se um webhook falhou, você pode reenviá-lo manualmente:

1. Localize o webhook na tabela
2. Clique no botão **"Reenviar"** (ícone de retry)
3. O webhook será enviado novamente imediatamente
4. Verifique o status atualizado

---

## 🔧 Troubleshooting

### **Problema: Webhook não está sendo enviado**

**Possíveis Causas:**
1. ❌ Configuração não está ativa
2. ❌ URL incorreta
3. ❌ Cron job não está rodando

**Soluções:**
1. ✅ Verifique se a configuração está salva
2. ✅ Teste a URL manualmente (curl/Postman)
3. ✅ Verifique os logs do servidor

---

### **Problema: Webhook retorna erro 401**

**Causa:** Assinatura inválida

**Soluções:**
1. ✅ Verifique se a Secret Key está correta
2. ✅ Certifique-se de usar o payload RAW (não parsed)
3. ✅ Use `crypto.timingSafeEqual` ou equivalente
4. ✅ Verifique se está usando SHA-256 (não SHA-1)

---

### **Problema: Webhook retorna erro 500**

**Causa:** Erro no seu servidor

**Soluções:**
1. ✅ Verifique os logs do seu servidor
2. ✅ Teste o endpoint manualmente
3. ✅ Adicione try/catch no código
4. ✅ Retorne 200 mesmo se houver erro interno

---

### **Problema: Webhook demora muito**

**Causa:** Processamento síncrono

**Soluções:**
1. ✅ Processe de forma assíncrona (fila/background job)
2. ✅ Retorne 200 imediatamente
3. ✅ Processe os dados depois
4. ✅ Use Redis/RabbitMQ para filas

---

## 📝 Exemplo Completo

### **Fluxo Real:**

```
1. Dia 10/01/2026 - Vencimento da cobrança
2. Dia 11/01/2026 00:00 - Cron detecta atraso
3. Sistema envia webhook:

POST https://seu-sistema.com/api/webhooks/inadimplencia
Headers:
  Content-Type: application/json
  X-Webhook-Signature: sha256=abc123...
  X-Webhook-Event: inadimplencia.detectada
  X-Webhook-ID: 550e8400-e29b-41d4-a716-446655440000
  X-Webhook-Timestamp: 2026-01-11T00:00:00.000Z

Body:
{
  "evento": "inadimplencia.detectada",
  "timestamp": "2026-01-11T00:00:00.000Z",
  "dados": {
    "cobranca": {
      "id": "abc123",
      "mesReferencia": "2026-01",
      "dataVencimento": "2026-01-10",
      "valor": 35000,
      "status": "atrasado",
      "diasAtraso": 1
    },
    "cliente": {
      "nome": "João Silva",
      "telefone": "(11) 98765-4321",
      "email": "joao@exemplo.com"
    }
  }
}

4. Seu sistema:
   - Valida assinatura ✅
   - Envia SMS/Email para cliente
   - Cria tarefa para consultor
   - Retorna 200 OK

5. Sistema Reobote:
   - Marca webhook como entregue ✅
   - Registra no log
```

---

## 🎯 Boas Práticas

### **✅ FAÇA:**

1. ✅ Valide a assinatura HMAC
2. ✅ Retorne 200 rapidamente (< 5s)
3. ✅ Processe de forma assíncrona
4. ✅ Logue todos os webhooks recebidos
5. ✅ Use HTTPS (não HTTP)
6. ✅ Guarde a Secret Key em local seguro
7. ✅ Monitore falhas e timeouts
8. ✅ Implemente idempotência (mesmo webhook 2x)

### **❌ NÃO FAÇA:**

1. ❌ Processar de forma síncrona (lento)
2. ❌ Ignorar a validação de assinatura
3. ❌ Expor a Secret Key no código
4. ❌ Retornar erro 500 para dados inválidos
5. ❌ Demorar mais de 30 segundos
6. ❌ Usar HTTP (sem SSL)
7. ❌ Processar o mesmo webhook múltiplas vezes

---

## 📞 Suporte

Se você tiver dúvidas ou problemas:

1. 📖 Consulte esta documentação
2. 🔍 Verifique os logs do webhook
3. 🧪 Teste manualmente com curl/Postman
4. 📧 Entre em contato: https://help.manus.im

---

## 🎉 Pronto!

Seu sistema agora está integrado e receberá notificações automáticas de inadimplência em tempo real! 🚀

**Última atualização:** 19/01/2026
