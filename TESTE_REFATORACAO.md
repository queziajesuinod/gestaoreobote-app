# Teste de Refatoração - Módulo de Leads IA

## Checklist de Validação

### ✅ Fase 1: Remoção de Funcionalidades de Envio

- [x] Função `sugerirResposta()` removida do `server/services/ia.js`
- [x] Função `enviarMensagemTexto()` removida do `server/services/evolutionService.js`
- [x] Exports atualizados nos serviços
- [ ] Verificar se não há referências a essas funções no código
- [ ] Verificar se não há rotas de envio de mensagens

### ✅ Fase 2: Melhorias na Importação

- [x] Serviço `sincronizacaoService.js` criado
- [x] Função `sincronizarTodosLeads()` implementada
- [x] Função `sincronizarInstancia()` implementada
- [x] Função `agendarSincronizacao()` implementada
- [x] Integração com `server/index.js` para iniciar sincronização automática
- [x] Dependência `node-cron` adicionada ao `package.json`

### ✅ Fase 3: Dashboard de Insights

- [x] Serviço `insightsService.js` criado
- [x] Função `gerarInsightsLead()` implementada
- [x] Função `gerarInsightsConsultor()` implementada
- [x] Controller `obterInsightsLead()` adicionado
- [x] Controller `obterInsightsConsultor()` adicionado
- [x] Controller `importarContatosLote()` adicionado
- [x] Controller `sincronizarLead()` adicionado
- [x] Rotas adicionadas ao `server/routers/leads.js`

### ⏳ Fase 4: Testes de Integração

#### Teste 1: Verificar Remoção de Funções de Envio

```bash
# Buscar referências a funções removidas
cd /home/ubuntu/gestaoreobote-app
grep -r "sugerirResposta" server/ --exclude-dir=node_modules
grep -r "enviarMensagemTexto" server/ --exclude-dir=node_modules
```

**Resultado esperado:** Nenhuma referência encontrada

#### Teste 2: Validar Estrutura de Serviços

```bash
# Verificar se os novos serviços existem
ls -la server/services/sincronizacaoService.js
ls -la server/services/insightsService.js
```

**Resultado esperado:** Ambos os arquivos existem

#### Teste 3: Validar Exports dos Controllers

```bash
# Verificar exports do controller de leads
grep -A 10 "module.exports" server/controllers/leads.js
```

**Resultado esperado:** Deve incluir:
- `sincronizarLead`
- `obterInsightsLead`
- `obterInsightsConsultor`
- `importarContatosLote`

#### Teste 4: Validar Rotas

```bash
# Verificar rotas de leads
cat server/routers/leads.js
```

**Resultado esperado:** Deve incluir:
- `POST /:leadId/sincronizar`
- `GET /:leadId/insights`
- `GET /consultor/:consultorId/insights`
- `POST /consultor/:consultorId/importar-lote`

#### Teste 5: Validar Dependências

```bash
# Verificar se node-cron está no package.json
grep "node-cron" package.json
```

**Resultado esperado:** `"node-cron": "^3.0.3"`

#### Teste 6: Validar Inicialização da Sincronização

```bash
# Verificar se sincronização está sendo iniciada
grep -A 5 "sincronizacaoService" server/index.js
```

**Resultado esperado:** Código de inicialização presente

---

## Testes Funcionais (Requerem Servidor Rodando)

### Pré-requisitos

1. Instalar dependências:
```bash
cd /home/ubuntu/gestaoreobote-app
npm install
```

2. Configurar variáveis de ambiente:
```bash
# Criar arquivo .env se não existir
cp .env.example .env

# Configurar:
# - OPENAI_API_KEY
# - JWT_SECRET
# - Database credentials
```

3. Executar migrations:
```bash
npx sequelize-cli db:migrate
```

4. Iniciar servidor:
```bash
npm start
```

---

### Teste Funcional 1: Sincronização Manual de Lead

**Endpoint:** `POST /leads/:leadId/sincronizar`

**Request:**
```bash
curl -X POST http://localhost:3000/leads/LEAD_UUID/sincronizar \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**
```json
{
  "sucesso": true,
  "mensagem": "Sincronização concluída",
  "mensagensNovas": 5,
  "temperaturaAtualizada": 75
}
```

---

### Teste Funcional 2: Obter Insights de Lead

**Endpoint:** `GET /leads/:leadId/insights`

**Request:**
```bash
curl -X GET http://localhost:3000/leads/LEAD_UUID/insights \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

**Resposta esperada:**
```json
{
  "sucesso": true,
  "insights": {
    "leadId": "uuid",
    "nome": "João Silva",
    "temperatura": 75,
    "classificacao": "quente",
    "totalMensagens": 50,
    "totalAnalisadas": 45,
    "sinaisCompra": [
      { "sinal": "pediu_simulacao", "ocorrencias": 3 },
      { "sinal": "perguntou_documentos", "ocorrencias": 2 }
    ],
    "objecoes": [
      { "objecao": "preco_alto", "ocorrencias": 1 }
    ],
    "topicos": [
      { "topico": "contemplacao", "ocorrencias": 5 }
    ],
    "distribuicaoSentimento": {
      "positivo": 30,
      "neutro": 10,
      "negativo": 5
    },
    "tendencia": "melhorando",
    "diasSemMensagem": 1,
    "recomendacoes": [
      {
        "tipo": "urgente",
        "mensagem": "Lead quente! Priorize o contato para fechar negócio.",
        "icone": "🔥"
      }
    ],
    "resumo": "Cliente interessado em consórcio de imóvel..."
  }
}
```

---

### Teste Funcional 3: Obter Insights do Consultor

**Endpoint:** `GET /leads/consultor/:consultorId/insights`

**Request:**
```bash
curl -X GET "http://localhost:3000/leads/consultor/meu/insights?temperatura=quente" \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

**Resposta esperada:**
```json
{
  "sucesso": true,
  "insights": {
    "consultorId": 123,
    "totalLeads": 50,
    "distribuicao": {
      "quentes": 15,
      "mornos": 25,
      "frios": 10
    },
    "percentuais": {
      "quentes": "30.0",
      "mornos": "50.0",
      "frios": "20.0"
    },
    "topSinaisCompra": [
      { "sinal": "pediu_simulacao", "ocorrencias": 25 },
      { "sinal": "perguntou_documentos", "ocorrencias": 20 }
    ],
    "topObjecoes": [
      { "objecao": "preco_alto", "ocorrencias": 15 },
      { "objecao": "precisa_pensar", "ocorrencias": 10 }
    ],
    "topTopicos": [
      { "topico": "contemplacao", "ocorrencias": 50 },
      { "topico": "lance_embutido", "ocorrencias": 30 }
    ],
    "leadsAtencao": [
      {
        "id": "uuid",
        "nome": "Maria Santos",
        "temperatura": 75,
        "diasSemMensagem": 3,
        "motivo": "Lead quente sem interação"
      }
    ]
  }
}
```

---

### Teste Funcional 4: Importar Contatos em Lote

**Endpoint:** `POST /leads/consultor/:consultorId/importar-lote`

**Request:**
```bash
curl -X POST http://localhost:3000/leads/consultor/meu/importar-lote \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "evolutionInstanceId": "instance-uuid",
    "contatosSelecionados": [
      {
        "id": "5511999999999@s.whatsapp.net",
        "name": "João Silva",
        "remoteJid": "5511999999999@s.whatsapp.net"
      },
      {
        "id": "5511888888888@s.whatsapp.net",
        "name": "Maria Santos",
        "remoteJid": "5511888888888@s.whatsapp.net"
      }
    ]
  }'
```

**Resposta esperada:**
```json
{
  "sucesso": true,
  "mensagem": "Importação concluída: 2 sucesso, 0 falhas",
  "resultados": {
    "sucesso": 2,
    "falhas": 0,
    "detalhes": [
      {
        "contato": "João Silva",
        "status": "sucesso",
        "leadCriado": true
      },
      {
        "contato": "Maria Santos",
        "status": "sucesso",
        "leadCriado": false
      }
    ]
  }
}
```

---

### Teste Funcional 5: Sincronização Automática

**Validação:**

1. Iniciar o servidor
2. Aguardar 1 minuto (primeira sincronização)
3. Verificar logs do console:

```
🔄 Sincronização automática agendada (a cada 15 minutos)
🔄 Executando primeira sincronização de leads...
[SYNC] Iniciando sincronização automática...
[SYNC] Encontradas 1 instâncias ativas
[SYNC] Sincronizando 5 leads da instância minha-instancia
[SYNC] Lead João Silva: 2 novas mensagens, temperatura: 75
[SYNC] Instância minha-instancia: 5 sucessos, 0 falhas
[SYNC] Sincronização automática concluída.
```

4. Aguardar 15 minutos para verificar próxima sincronização automática

---

## Testes de Regressão

### Teste 1: Funcionalidades Existentes Ainda Funcionam

- [ ] Listar leads: `GET /leads/:consultorId`
- [ ] Obter lead: `GET /leads/detalhes/:leadId`
- [ ] Criar lead manual: `POST /leads/`
- [ ] Atualizar lead: `PUT /leads/:leadId`
- [ ] Promover a cliente: `POST /leads/:leadId/promover-cliente`
- [ ] Vincular Agendor: `POST /leads/:leadId/vincular-agendor`
- [ ] Sincronizar Agendor: `POST /leads/:leadId/sincronizar-agendor`

### Teste 2: Análise de IA Continua Funcionando

- [ ] Mensagens são analisadas durante importação
- [ ] Temperatura é calculada corretamente
- [ ] Resumo de IA é gerado
- [ ] Dados estruturados são extraídos

### Teste 3: Integração com Evolution API

- [ ] Buscar contatos funciona
- [ ] Buscar mensagens funciona
- [ ] Sincronizar chat funciona
- [ ] Webhook continua recebendo mensagens

---

## Testes de Performance

### Teste 1: Sincronização de Múltiplos Leads

**Cenário:** 50 leads com sync habilitado

**Validação:**
- Tempo total de sincronização < 5 minutos
- Nenhum erro de timeout
- Todas as mensagens são importadas

### Teste 2: Geração de Insights

**Cenário:** Lead com 500 mensagens

**Validação:**
- Insights gerados em < 3 segundos
- Todos os sinais de compra identificados
- Todas as objeções identificadas
- Temperatura calculada corretamente

### Teste 3: Dashboard de Insights do Consultor

**Cenário:** Consultor com 100 leads

**Validação:**
- Insights gerados em < 5 segundos
- Estatísticas corretas
- Top 10 sinais/objeções/tópicos corretos

---

## Testes de Segurança

### Teste 1: Autenticação

- [ ] Endpoints protegidos exigem token JWT
- [ ] Token inválido retorna 401
- [ ] Token expirado retorna 401

### Teste 2: Autorização

- [ ] Consultor não pode ver leads de outro consultor
- [ ] Gestor pode ver todos os leads
- [ ] Consultor não pode sincronizar leads de outro consultor

### Teste 3: Validação de Entrada

- [ ] Telefone inválido retorna erro
- [ ] Evolution instance inexistente retorna erro
- [ ] Lead inexistente retorna 404

---

## Checklist Final

- [ ] Todas as funções de envio removidas
- [ ] Sincronização automática funcionando
- [ ] Insights de lead funcionando
- [ ] Insights de consultor funcionando
- [ ] Importação em lote funcionando
- [ ] Testes funcionais passando
- [ ] Testes de regressão passando
- [ ] Testes de performance aceitáveis
- [ ] Testes de segurança passando
- [ ] Logs informativos no console
- [ ] Sem erros no console
- [ ] Documentação atualizada

---

## Problemas Conhecidos

### Issue 1: [Descrever se houver]

**Descrição:**  
**Impacto:**  
**Solução:**

---

## Próximos Passos

1. Executar todos os testes listados acima
2. Corrigir bugs encontrados
3. Otimizar performance se necessário
4. Atualizar documentação
5. Fazer commit das mudanças
6. Criar pull request

---

**Data do Teste:** [A preencher]  
**Testado por:** [A preencher]  
**Status:** ⏳ Aguardando testes
