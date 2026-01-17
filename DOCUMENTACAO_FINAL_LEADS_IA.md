# Documentação Final - Refatoração Módulo Leads IA

## Resumo Executivo

Refatoração completa do módulo de análise de leads com IA, focando em:
- ✅ **Importação** de leads e mensagens da Evolution API
- ✅ **Análise de IA** para classificar leads (Quente, Morno, Frio)
- ✅ **Dashboard de insights** para consultores
- ❌ **Removido:** Envio de mensagens (foco apenas em análise)

---

## Funcionalidades Implementadas

### 1. Importação de Leads

#### 1.1 Importação Manual
- Cadastro direto de lead com nome, telefone e email
- Lead criado sem conversa inicial

#### 1.2 Importação pela Evolution API
- Busca de contatos/chats na instância WhatsApp
- Formatação automática de números
- Criação automática de conversa vinculada

**Formatos de número suportados:**

| Entrada do Usuário | Número Limpo | Formatado | Resultado Final |
|--------------------|--------------|-----------|-----------------|
| `6792616118` | `6792616118` | `556792616118` | `556792616118@s.whatsapp.net` |
| `67992616118` | `67992616118` | `5567992616118` | `5567992616118@s.whatsapp.net` |
| `(67) 9262-6118` | `6792626118` | `556792626118` | `556792626118@s.whatsapp.net` |
| `(67) 99262-6118` | `67992626118` | `5567992626118` | `5567992626118@s.whatsapp.net` |
| `+55 67 9262-6118` | `556792626118` | `556792626118` | `556792626118@s.whatsapp.net` |

**Lógica de formatação:**
1. Remove caracteres não numéricos
2. Se não começa com 55 E tem 10 ou 11 dígitos → adiciona 55
3. Adiciona sufixo `@s.whatsapp.net`

---

### 2. Sincronização de Mensagens

#### 2.1 Sincronização Manual
- Botão "Atualizar" na página de detalhes do lead
- Busca mensagens no WhatsApp via Evolution API
- Aplica filtro configurado (não lidas, todas, últimas 24h)

#### 2.2 Sincronização Automática
- Cron job executado a cada 15 minutos
- Sincroniza todos os leads com `evolutionSyncEnabled = true`
- Respeita configuração `sincronizarApenas` da instância

#### 2.3 Filtros de Sincronização

| Filtro | Descrição | Quando Usar |
|--------|-----------|-------------|
| **Apenas não lidas** | Sincroniza apenas mensagens não lidas | Uso contínuo (economiza processamento) |
| **Todas as mensagens** | Sincroniza todo o histórico | Primeira importação |
| **Últimas 24 horas** | Sincroniza apenas mensagens recentes | Leads inativos |

**Configuração:**
- Acesse: `/app/configuracoes/whatsapp`
- Campo: "Tipo de sincronização"
- Salvo na tabela `evolution_instances.sincronizarApenas`

---

### 3. Análise de IA

#### 3.1 Classificação de Temperatura
- **Quente (70-100):** Pronto para fechar, alta intenção de compra
- **Morno (40-69):** Interessado mas com objeções
- **Frio (0-39):** Pouco interesse ou sem resposta

#### 3.2 Análise de Sentimento
- Positivo, Neutro, Negativo
- Baseado no tom das mensagens

#### 3.3 Extração de Informações
- Sinais de compra identificados
- Objeções levantadas
- Tópicos de interesse
- Valor e prazo desejados

---

### 4. Dashboard de Insights

**Rota:** `/app/leads-insights`

**Visualizações:**
- Distribuição de leads por temperatura (gráfico de pizza)
- Top 10 sinais de compra (gráfico de barras)
- Top 10 objeções (gráfico de barras)
- Lista de leads que precisam de atenção
- Filtros por temperatura

---

## Arquitetura Técnica

### Modelos de Dados

```
Lead
├── id (UUID)
├── consultorId
├── nome
├── telefone
├── email
├── temperaturaLead (0-100)
├── sentimentoGeral
├── evolutionInstanceId
├── evolutionSyncEnabled
└── conversas[]
    └── Conversa
        ├── id (UUID)
        ├── leadId
        ├── chatId (remoteJid do WhatsApp)
        ├── plataforma ("whatsapp")
        └── mensagens[]
            └── Mensagem
                ├── id (UUID)
                ├── conversaId
                ├── evolutionMessageId
                ├── conteudo
                ├── remetente
                └── dataHora
```

### Serviços

#### evolutionService.js
- `buscarChats()` - Lista chats da instância
- `buscarMensagensChat()` - Busca mensagens de um chat
- `sincronizarChat()` - Sincroniza mensagens e cria registros
- `decryptApiKey()` - Descriptografa apiKey do banco

#### sincronizacaoService.js
- `sincronizarTodosLeads()` - Sincronização automática (cron)
- `iniciarSincronizacaoAutomatica()` - Agenda cron job

#### insightsService.js
- `gerarInsightsLead()` - Gera insights de um lead específico
- `gerarInsightsDashboard()` - Gera dashboard consolidado

#### iaService.js
- `analisarConversa()` - Analisa mensagens com IA
- `calcularTemperaturaLead()` - Calcula score de temperatura

---

## Endpoints da API

### Leads

```
GET    /leads/:id                    - Buscar lead
GET    /leads/:id/insights           - Obter insights do lead
POST   /leads/:id/sincronizar        - Sincronizar mensagens manualmente
GET    /leads/consultor/:id/insights - Dashboard de insights do consultor
```

### Evolution

```
GET    /evolution/status             - Status da instância
POST   /evolution/configurar         - Configurar instância
POST   /evolution/contatos/buscar    - Buscar contatos (importar)
POST   /evolution/contatos/importar  - Importar contato como lead
```

---

## Fluxo de Importação Completo

### Cenário 1: Importar Contato pela Evolution

1. **Usuário acessa:** `/app/configuracoes/whatsapp`
2. **Clica em:** "Importar por Contato"
3. **Digite número:** `67992616118`
4. **Sistema:**
   - Formata: `5567992616118@s.whatsapp.net`
   - Busca chat: `POST /chat/findChats/{instance}`
   - Encontra chat pelo `remoteJid`
5. **Cria/atualiza lead:**
   - Nome do `pushName` do chat
   - Telefone normalizado
   - `evolutionInstanceId` vinculado
6. **Cria conversa:**
   - `chatId` = `remoteJid` real
   - `plataforma` = "whatsapp"
7. **Sincroniza mensagens:**
   - `POST /chat/findMessages/{instance}`
   - Filtra por `remoteJid`
   - Cria registros de `Mensagem`
8. **Analisa com IA:**
   - Processa todas as mensagens
   - Calcula temperatura
   - Extrai insights

---

### Cenário 2: Sincronizar Lead Existente

1. **Usuário acessa:** `/app/leads/{leadId}`
2. **Clica em:** "Atualizar" (ícone de refresh)
3. **Sistema verifica:**
   - Lead tem `evolutionInstanceId`?
   - Se não, busca pelo `consultorId`
4. **Busca conversa:**
   - Se não existe, busca chat real na Evolution
   - Cria conversa com `chatId` correto
5. **Sincroniza mensagens:**
   - Aplica filtro `sincronizarApenas`
   - Ignora duplicadas (por `evolutionMessageId`)
   - Cria apenas novas mensagens
6. **Analisa com IA:**
   - Reprocessa todas as mensagens
   - Atualiza temperatura
   - Atualiza insights

---

## Problemas Resolvidos

### 1. Autenticação Evolution API
**Problema:** apiKey criptografado sendo enviado  
**Solução:** Descriptografar com `decryptApiKey()` antes de usar

### 2. Busca de Chats
**Problema:** Endpoint `/contact/findContacts` retornava 404  
**Solução:** Usar `/chat/findChats` (funciona em todas as versões)

### 3. Parsing de Mensagens
**Problema:** Código acessava `response.data` ao invés de `response.data.messages.records`  
**Solução:** Ajustar parsing para estrutura correta da API

### 4. ChatId Errado
**Problema:** Salvava `chat.id` (ID interno) ao invés de `chat.remoteJid`  
**Solução:** Priorizar `remoteJid` sobre `id`

### 5. Formatação de Números
**Problema:** Números de 10 dígitos não recebiam código 55  
**Solução:** Adicionar 55 para números de 10 OU 11 dígitos

### 6. Conversa Não Criada
**Problema:** Leads manuais não tinham conversa para sincronizar  
**Solução:** Buscar chat real na Evolution e criar conversa automaticamente

### 7. Duplicação de Mensagens
**Problema:** Sincronizações repetidas criavam mensagens duplicadas  
**Solução:** Verificar `evolutionMessageId` antes de criar

---

## Configuração da Instância Evolution

### Campos da Tabela `evolution_instances`

```sql
CREATE TABLE evolution_instances (
  id UUID PRIMARY KEY,
  consultorId INT NOT NULL UNIQUE,
  instanceName VARCHAR(100) NOT NULL,
  apiUrl VARCHAR(255) NOT NULL,
  apiKey TEXT NOT NULL, -- Criptografado
  status ENUM('conectada', 'desconectada', 'erro'),
  sincronizarAutomaticamente BOOLEAN DEFAULT true,
  sincronizarApenas ENUM('nao_lidas', 'todas', 'ultimas_24h') DEFAULT 'nao_lidas',
  ultimaSincronizacao TIMESTAMP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Como Configurar

1. **Acesse:** `/app/configuracoes/whatsapp`
2. **Preencha:**
   - Nome da Instância (ex: `ALEFECTEC_8`)
   - URL da API (ex: `https://evo.aleftec.com.br`)
   - API Key (será criptografada automaticamente)
3. **Opções:**
   - ☑️ Sincronizar automaticamente
   - Tipo de sincronização: [Apenas não lidas ▼]
4. **Salvar**

---

## Testes Recomendados

### Teste 1: Importar Contato
1. Acesse configuração do WhatsApp
2. Digite número: `67992616118`
3. Verifique se encontra o contato
4. Importe e verifique se lead foi criado
5. Verifique se mensagens foram importadas

### Teste 2: Sincronizar Lead
1. Acesse um lead existente
2. Clique em "Atualizar"
3. Verifique logs no servidor
4. Confirme que novas mensagens foram importadas
5. Verifique se temperatura foi atualizada

### Teste 3: Dashboard de Insights
1. Acesse `/app/leads-insights`
2. Verifique gráficos de distribuição
3. Teste filtros de temperatura
4. Verifique lista de leads prioritários

---

## Logs de Debug

### Sincronização
```
[SYNC] Iniciando sincronização do lead...
[SYNC] Lead encontrado: Nome, consultorId: 1
[SYNC] Instância encontrada: ALEFECTEC_8
[SYNC] Conversa encontrada: chatId=...
[BUSCAR_MSG] Mensagens retornadas: 25
[SYNC_CHAT] Sincronização concluída: 25 novas, 0 duplicadas
```

### Busca de Contatos
```
[BUSCAR_CONTATOS] Número digitado: 67992616118
[BUSCAR_CONTATOS] Número formatado: 5567992616118@s.whatsapp.net
[BUSCAR_CHATS] Total de chats retornados: 863
```

### Insights
```
[INSIGHTS] Gerando insights para lead: {uuid}
[INSIGHTS] Lead encontrado: Nome
[INSIGHTS] Conversas: 1
[INSIGHTS] Mensagens analisadas: 25
[INSIGHTS] Temperatura calculada: 75
```

---

## Commits Realizados

Total: **27 commits** na branch `leads_IA`

### Principais Commits

1. `3045079` - Refatoração completa do módulo
2. `574a363` - Fix de sincronização
3. `d53789d` - Busca instância por consultorId
4. `4fe5b3b` - Filtro de sincronização ativo
5. `f7bee4f` - Fix parsing de mensagens
6. `89bd9a3` - Fix ordem remoteJid
7. `9606b91` - Fix salvar remoteJid
8. `c38ecbc` - Formatação automática de número
9. `452eeef` - Usar /chat/findChats
10. `36e429c` - Adicionar 55 para 10 dígitos

---

## Próximos Passos Recomendados

### Melhorias Futuras

1. **Notificações:**
   - Alertar consultor quando lead ficar "quente"
   - Notificar mensagens não lidas

2. **Relatórios:**
   - Exportar insights em PDF
   - Gráficos de evolução de temperatura

3. **Automação:**
   - Sugerir ações baseadas em insights
   - Agendar follow-ups automaticamente

4. **Integração:**
   - Sincronizar com CRM externo
   - Integrar com Agendor (já tem campo `negocioAgendorId`)

---

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Consulte esta documentação
3. Revise os commits no GitHub
4. Entre em contato com a equipe de desenvolvimento

---

**Documentação gerada em:** 17/01/2026  
**Versão:** 1.0  
**Branch:** `leads_IA`  
**Status:** ✅ Refatoração completa e funcional
