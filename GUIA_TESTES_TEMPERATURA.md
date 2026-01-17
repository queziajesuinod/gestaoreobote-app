# 🧪 Guia de Testes de Classificação de Temperatura de Leads

## 📋 Visão Geral

Este guia contém 3 scripts SQL para testar a funcionalidade de classificação de temperatura de leads (Quente/Morno/Frio) com base em conversas simuladas realistas.

## 📁 Scripts Disponíveis

1. **TESTE_LEAD_QUENTE.sql** - Lead com alto interesse e urgência 🔥
2. **TESTE_LEAD_MORNO.sql** - Lead com interesse moderado, ainda pesquisando 🌡️
3. **TESTE_LEAD_FRIO.sql** - Lead com baixo interesse ou objeções fortes ❄️

## 🎯 Objetivo dos Testes

Validar se a IA está classificando corretamente os leads com base em:
- **Urgência** nas mensagens
- **Orçamento** definido ou indefinido
- **Objeções** levantadas
- **Engajamento** (frequência e qualidade das respostas)
- **Sinais de compra** (perguntas sobre processo, documentos, etc.)
- **Sentimento** (positivo, neutro, negativo)

## 🚀 Como Executar os Testes

### Pré-requisitos

1. Acesso ao banco de dados PostgreSQL
2. Schema `dev` criado
3. Tabelas necessárias: `leads`, `conversas`, `mensagens`
4. Pelo menos uma instância Evolution configurada (ID 1)
5. Pelo menos um consultor cadastrado (ID 1)

### Passo 1: Ajustar IDs nos Scripts

**IMPORTANTE:** Antes de executar, ajuste os seguintes valores em TODOS os 3 scripts:

```sql
consultorId = 1, -- Substitua pelo ID do consultor de teste
evolutionInstanceId = 1, -- Substitua pelo ID da instância Evolution
```

Para descobrir os IDs corretos:

```sql
-- Listar consultores
SELECT id, nome, email FROM dev.users WHERE perfil = 'CONSULTOR';

-- Listar instâncias Evolution
SELECT id, instanceName, consultorId FROM dev.evolution_instances;
```

### Passo 2: Executar os Scripts

Execute os scripts na ordem que preferir. Cada script cria:
- 1 lead com dados de teste
- 1 conversa vinculada ao lead
- 10-13 mensagens simulando uma conversa realista

**Opção A: Via psql (linha de comando)**

```bash
# Lead Quente
psql -U seu_usuario -d seu_banco -f TESTE_LEAD_QUENTE.sql

# Lead Morno
psql -U seu_usuario -d seu_banco -f TESTE_LEAD_MORNO.sql

# Lead Frio
psql -U seu_usuario -d seu_banco -f TESTE_LEAD_FRIO.sql
```

**Opção B: Via cliente SQL (DBeaver, pgAdmin, etc.)**

1. Abra o arquivo SQL no cliente
2. Ajuste os IDs conforme necessário
3. Execute o script completo
4. Verifique a mensagem de sucesso no output

### Passo 3: Verificar Leads Criados

```sql
SELECT 
  l.id,
  l.nome,
  l.telefone,
  l.status,
  COUNT(m.id) as total_mensagens
FROM dev.leads l
LEFT JOIN dev.conversas c ON c.leadId = l.id
LEFT JOIN dev.mensagens m ON m.conversaId = c.id
WHERE l.telefone IN ('5511999999001', '5511999999002', '5511999999003')
GROUP BY l.id, l.nome, l.telefone, l.status
ORDER BY l.telefone;
```

**Resultado esperado:**
- Lead 5511999999001 (Quente): 11 mensagens
- Lead 5511999999002 (Morno): 11 mensagens
- Lead 5511999999003 (Frio): 12 mensagens

### Passo 4: Executar Análise de IA

Acesse o sistema e execute a análise de insights:

**Via Interface:**
1. Acesse o menu "Leads"
2. Clique em "Insights de Leads"
3. Aguarde a análise ser processada
4. Verifique a classificação de cada lead

**Via API (opcional):**

```bash
curl -X POST http://localhost:3000/api/leads/insights \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "consultorId": 1
  }'
```

### Passo 5: Validar Resultados

Acesse cada lead individualmente e verifique:

#### Lead Quente (5511999999001) - Esperado: 🔥 QUENTE

**Sinais que devem ser identificados:**
- ✅ Urgência explícita
- ✅ Orçamento definido (50 mil entrada)
- ✅ Decisão iminente
- ✅ Reunião agendada
- ✅ Validação com terceiros
- ✅ Sentimento positivo

**Temperatura esperada:** QUENTE (80-100%)

#### Lead Morno (5511999999002) - Esperado: 🌡️ MORNO

**Sinais que devem ser identificados:**
- ⚠️ Interesse moderado
- ⚠️ Ainda comparando opções
- ⚠️ Orçamento indefinido
- ⚠️ Respostas espaçadas
- ⚠️ Adia decisões
- ⚠️ Sentimento neutro

**Temperatura esperada:** MORNO (40-79%)

#### Lead Frio (5511999999003) - Esperado: ❄️ FRIO

**Sinais que devem ser identificados:**
- ❄️ Perguntas superficiais
- ❄️ Múltiplas objeções
- ❄️ Sem orçamento
- ❄️ Desinteresse
- ❄️ Para de responder
- ❄️ Sentimento negativo

**Temperatura esperada:** FRIO (0-39%)

## 📊 Critérios de Sucesso

O teste é considerado **APROVADO** se:

1. ✅ Lead Quente classificado como QUENTE (temperatura ≥ 80%)
2. ✅ Lead Morno classificado como MORNO (temperatura entre 40-79%)
3. ✅ Lead Frio classificado como FRIO (temperatura ≤ 39%)
4. ✅ Sinais de compra identificados corretamente
5. ✅ Objeções identificadas corretamente
6. ✅ Sentimento analisado corretamente
7. ✅ Recomendações de ação coerentes com a temperatura

## 🔧 Troubleshooting

### Problema: Script retorna erro de foreign key

**Solução:** Verifique se os IDs de `consultorId` e `evolutionInstanceId` existem:

```sql
SELECT id FROM dev.users WHERE id = 1; -- Deve retornar 1 linha
SELECT id FROM dev.evolution_instances WHERE id = 1; -- Deve retornar 1 linha
```

### Problema: Lead não aparece na interface

**Solução:** Verifique se o lead foi criado e está vinculado ao consultor correto:

```sql
SELECT * FROM dev.leads WHERE telefone = '5511999999001';
```

### Problema: Análise de IA não executa

**Solução:** Verifique os logs do servidor:

```bash
# No terminal do servidor
tail -f logs/server.log | grep -i "insight\|temperatura\|analise"
```

### Problema: Temperatura classificada incorretamente

**Possíveis causas:**
1. Modelo de IA precisa de ajuste nos prompts
2. Peso dos sinais precisa ser calibrado
3. Conversas muito curtas (adicione mais mensagens)

## 🧹 Limpeza dos Dados de Teste

Para remover os leads de teste após validação:

```sql
-- Deletar leads de teste e dados relacionados (cascade)
DELETE FROM dev.leads 
WHERE telefone IN ('5511999999001', '5511999999002', '5511999999003');

-- Verificar se foram removidos
SELECT COUNT(*) FROM dev.leads 
WHERE telefone IN ('5511999999001', '5511999999002', '5511999999003');
-- Deve retornar 0
```

## 📝 Notas Importantes

1. **Não use em produção:** Estes scripts são apenas para testes em ambiente de desenvolvimento
2. **Ajuste os IDs:** Sempre ajuste `consultorId` e `evolutionInstanceId` antes de executar
3. **Timestamps:** As mensagens são criadas com timestamps retroativos (5-10 dias atrás) para simular conversas reais
4. **Idempotência:** Os scripts podem ser executados múltiplas vezes (usam `ON CONFLICT` e `DELETE`)

## 🎓 Entendendo os Padrões

### Lead Quente 🔥
- Responde rápido (minutos/horas)
- Faz perguntas específicas sobre processo
- Tem orçamento definido
- Demonstra urgência
- Agenda reuniões
- Sentimento positivo e empolgado

### Lead Morno 🌡️
- Responde em dias
- Ainda está pesquisando
- Orçamento indefinido ou vago
- Compara opções
- Adia decisões
- Sentimento neutro

### Lead Frio ❄️
- Responde muito devagar ou para de responder
- Perguntas muito genéricas
- Sem orçamento
- Múltiplas objeções
- Descrença no produto
- Sentimento negativo ou cético

## 📚 Referências

- `server/services/insightsService.js` - Lógica de análise de IA
- `app/containers/Pages/Leads/LeadsInsights.js` - Dashboard de insights
- `app/containers/Pages/Leads/LeadDetalhes.js` - Detalhes do lead
- `DOCUMENTACAO_FINAL_LEADS_IA.md` - Documentação completa do módulo

---

**Última atualização:** 2026-01-17  
**Versão:** 1.0  
**Autor:** Sistema de Gestão de Leads com IA
