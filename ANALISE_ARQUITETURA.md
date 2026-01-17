# Análise da Arquitetura Atual - Branch leads_IA

## Resumo Executivo

A branch `leads_IA` já possui uma estrutura funcional para gerenciamento de leads com integração ao Evolution API e análise via IA. A refatoração proposta visa **remover funcionalidades de envio de mensagens** e **focar exclusivamente em importação e análise**.

---

## Estrutura de Dados Existente

### Modelos (Database)

#### 1. **Lead** (`server/models/lead.js`)
- **Campos principais:**
  - `id` (UUID)
  - `consultorId` (INTEGER)
  - `nome`, `telefone`, `email`
  - `origem` (ENUM: 'whatsapp', 'manual', 'importacao')
  - `status` (ENUM: 'novo', 'em_contato', 'qualificado', 'perdido', 'convertido')
  - `temperaturaLead` (INTEGER 0-100)
  - `sentimentoGeral` (ENUM: 'positivo', 'neutro', 'negativo')
  - `resumoIA` (TEXT)
  - `evolutionInstanceId`, `evolutionSyncEnabled`
  - `ultimaSincronizacao`, `ultimaMensagem`, `totalMensagens`

#### 2. **Conversa** (`server/models/conversa.js`)
- **Campos principais:**
  - `id` (UUID)
  - `leadId`, `consultorId`
  - `plataforma` (ENUM: 'whatsapp', 'telegram', 'manual')
  - `chatId` (STRING - ID do chat no Evolution)
  - `status` (ENUM: 'ativa', 'arquivada')
  - `ultimaMensagem` (DATE)

#### 3. **Mensagem** (`server/models/mensagem.js`)
- **Campos principais:**
  - `id` (UUID)
  - `conversaId`
  - `remetente` (ENUM: 'consultor', 'lead')
  - `conteudo` (TEXT)
  - `tipoMidia` (ENUM: 'texto', 'audio', 'imagem', 'documento', 'video')
  - `urlMidia`, `transcricao`
  - `analisadaPorIA` (BOOLEAN)
  - `evolutionMessageId` (STRING)
  - `timestamp` (DATE)

#### 4. **AnaliseIA** (`server/models/analiseia.js`)
- **Campos principais:**
  - `id` (UUID)
  - `mensagemId` (UUID - unique)
  - `topicos` (ARRAY de strings)
  - `objecoes` (ARRAY de strings)
  - `sinaisCompra` (ARRAY de strings)
  - `intencao` (ENUM: 'compra', 'informacao', 'reclamacao', 'outro')
  - `sentimento` (ENUM: 'positivo', 'neutro', 'negativo')
  - `scoreConfianca` (DECIMAL 0-1)
  - `respostaJSON` (JSONB)

#### 5. **EvolutionInstance** (`server/models/evolutioninstance.js`)
- Armazena configurações de conexão com Evolution API
- `apiUrl`, `instanceName`, `apiKey` (criptografado)

---

## Serviços Existentes

### 1. **IA Service** (`server/services/ia.js`)

**Funções principais:**

1. **`analisarMensagem(conteudo, contexto)`**
   - Analisa mensagem individual usando OpenAI
   - Retorna: `topicos`, `objecoes`, `sinaisCompra`, `sentimento`, `scoreConfianca`

2. **`calcularTemperaturaLead(conversaId)`**
   - Calcula score 0-100 baseado em:
     - Sinais de compra (pesos positivos)
     - Objeções (pesos negativos)
     - Sentimento das últimas 5 mensagens
     - Tempo desde última mensagem
     - Detecção de spam
     - Taxa de sinais vs mensagens totais
   - Retorna: INTEGER (0-100)

3. **`gerarResumoConversa(conversaId)`**
   - Gera resumo em 2-3 frases usando IA
   - Destaca: interesse, objeções, sentimento geral

4. **`sugerirResposta(conversaId, ultimaMensagemLead)`**
   - **⚠️ DEVE SER REMOVIDO** (fora do escopo)

5. **`extrairDadosLead(conversaId)`**
   - Extrai dados estruturados da conversa
   - Retorna: nome, email, cidade, profissão, interesse, valor, prazo

**Pesos configurados:**
- **Sinais de compra:** perguntou_documentos (15), pediu_simulacao (12), mencionou_urgencia (12), etc.
- **Objeções:** nao_tem_interesse (-15), nao_tem_dinheiro (-12), preco_alto (-10), etc.
- **Sentimento:** positivo (+10), negativo (-10), neutro (0)

---

### 2. **Evolution Service** (`server/services/evolutionService.js`)

**Funções principais:**

1. **`testarConexao(apiUrl, instanceName, apiKey)`**
   - Valida conexão com Evolution API

2. **`buscarContatos(apiUrl, instanceName, apiKey)`**
   - Lista todos os contatos/chats da instância

3. **`buscarMensagensChat(apiUrl, instanceName, apiKey, chatId, limite)`**
   - Busca histórico de mensagens de um chat específico

4. **`sincronizarChat(evolutionInstance, chatId, leadId, limiteMensagens)`**
   - **FUNÇÃO CENTRAL:** Sincroniza mensagens do Evolution para o banco
   - Cria/atualiza Conversa
   - Importa mensagens (evita duplicatas via `evolutionMessageId`)
   - Analisa mensagens do lead com IA
   - Recalcula temperatura do lead
   - Atualiza timestamps

5. **`importarHistoricoContato(instance, consultorId, contato, options)`**
   - Importa contato e todo histórico de mensagens
   - Cria lead automaticamente se não existir
   - Chama `sincronizarChat` internamente

6. **`importarTodosChats(evolutionInstanceId, consultorId)`**
   - Importa todos os chats da instância Evolution

7. **`enviarMensagemTexto(apiUrl, instanceName, apiKey, numero, mensagem)`**
   - **⚠️ DEVE SER REMOVIDO** (fora do escopo)

8. **`configurarWebhook(apiUrl, instanceName, apiKey, webhookUrl)`**
   - Configura webhook para receber mensagens em tempo real

---

## Controllers e Rotas

### **Leads Controller** (`server/controllers/leads.js`)

**Endpoints principais:**

1. **GET `/api/leads/:consultorId`** - Listar leads
   - Filtros: status, temperatura, ordenação
   - Agrupa por temperatura (quente/morno/frio)

2. **GET `/api/leads/:leadId/detalhes`** - Obter lead específico
   - Inclui conversas, mensagens, análises de IA
   - Gera resumo de IA se não existir

3. **POST `/api/leads/criar`** - Criar lead manualmente
   - Valida telefone no WhatsApp via Evolution
   - Cria lead com origem 'manual'

4. **PUT `/api/leads/:leadId`** - Atualizar lead

5. **POST `/api/leads/:leadId/sincronizar`** - Sincronizar mensagens do Evolution
   - Chama `evolutionService.sincronizarChat`

6. **POST `/api/leads/:leadId/enviar-mensagem`** - **⚠️ DEVE SER REMOVIDO**

7. **POST `/api/leads/importar-contatos`** - Importar contatos do Evolution
   - Permite importação em lote

---

## Frontend

### **Componente Principal:** `LeadDetalhes.js`

**Funcionalidades atuais:**
- Exibe informações do lead
- Mostra temperatura e sentimento
- Timeline de conversas
- **Formulário de envio de mensagens** ⚠️ DEVE SER REMOVIDO
- Botão de sincronização manual
- Edição de dados do lead
- Promoção para cliente

**Componentes auxiliares:**
- `TemperaturaIndicador` - Visualização da temperatura (0-100)
- `AnaliseIACard` - Card com insights de IA
- `ConversaTimeline` - Timeline de mensagens com análises

---

## Problemas Identificados

### 1. **Funcionalidades de Envio Presentes**
- `sugerirResposta()` no IA Service
- `enviarMensagemTexto()` no Evolution Service
- Endpoint `/api/leads/:leadId/enviar-mensagem`
- Formulário de envio no frontend

### 2. **Falta de Insights Estruturados**
- Análises de IA estão armazenadas, mas não há dashboard de insights
- Não há visualização de tendências (sinais de compra, objeções recorrentes)
- Falta relatório consolidado por lead

### 3. **Sincronização Manual**
- Não há sincronização automática programada
- Dependência de ação manual do usuário

### 4. **Falta de Filtros Avançados**
- Não há filtro por sinais de compra específicos
- Não há filtro por objeções
- Não há busca por tópicos mencionados

---

## Proposta de Refatoração

### **Fase 1: Remoção de Funcionalidades de Envio**
1. Remover `sugerirResposta()` do IA Service
2. Remover `enviarMensagemTexto()` do Evolution Service
3. Remover endpoint `/api/leads/:leadId/enviar-mensagem`
4. Remover formulário de envio do frontend
5. Atualizar documentação

### **Fase 2: Melhorias na Importação**
1. Adicionar sincronização automática programada (cron job)
2. Melhorar feedback de progresso na importação
3. Adicionar validação de duplicatas
4. Implementar retry logic para falhas

### **Fase 3: Dashboard de Insights**
1. Criar endpoint para insights consolidados
2. Implementar componente de dashboard com:
   - Distribuição de temperatura (gráfico)
   - Top sinais de compra detectados
   - Top objeções recorrentes
   - Tendências de sentimento
   - Leads que precisam de atenção urgente
3. Adicionar filtros avançados

### **Fase 4: Análise Aprimorada**
1. Adicionar análise de padrões entre leads
2. Implementar sugestões de ações (sem envio)
3. Criar relatório de oportunidades perdidas
4. Adicionar análise de tempo de resposta

### **Fase 5: Otimizações**
1. Implementar cache para análises de IA
2. Otimizar queries do banco
3. Adicionar índices necessários
4. Implementar paginação eficiente

---

## Arquitetura Refatorada Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                      EVOLUTION API                          │
│                  (Fonte de Mensagens)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Webhook / Sincronização
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              MÓDULO DE IMPORTAÇÃO                           │
│  - Importar contatos manualmente                            │
│  - Importar via Evolution API                               │
│  - Sincronização automática (cron)                          │
│  - Validação e deduplicação                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 BANCO DE DADOS                              │
│  Leads → Conversas → Mensagens → AnálisesIA                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              MÓDULO DE ANÁLISE IA                           │
│  - Análise de mensagens individuais                         │
│  - Cálculo de temperatura (0-100)                           │
│  - Extração de dados estruturados                           │
│  - Geração de resumos                                       │
│  - Detecção de padrões                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              DASHBOARD DE INSIGHTS                          │
│  - Visualização de temperatura                              │
│  - Sinais de compra detectados                              │
│  - Objeções identificadas                                   │
│  - Tendências e padrões                                     │
│  - Recomendações de ação (SEM ENVIO)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Próximos Passos

1. ✅ Análise completa da arquitetura atual
2. 🔄 Criar plano detalhado de refatoração
3. ⏳ Implementar remoção de funcionalidades de envio
4. ⏳ Implementar melhorias na importação
5. ⏳ Criar dashboard de insights
6. ⏳ Testar e validar
7. ⏳ Documentar e entregar

---

**Data:** 2026-01-16  
**Branch:** leads_IA  
**Repositório:** queziajesuinod/gestaoreobote-app
