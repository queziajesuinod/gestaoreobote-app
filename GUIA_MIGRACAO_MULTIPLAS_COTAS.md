# 🚀 Guia de Migração - Processos com Múltiplas Cotas

## 📋 Visão Geral

Esta refatoração adiciona suporte para processos de cobrança com múltiplas cotas, onde cada cota pode ter:
- ✅ Valor de cobrança diferente
- ✅ Data de vencimento diferente  
- ✅ Quantidade de meses total diferente
- ✅ Quantidade de meses pagos (retroativo) diferente

## 🔧 Alterações Realizadas

### Backend

#### 1. **Nova Tabela: `cotas_processo_cobranca`**
Tabela intermediária que vincula cotas a processos com configurações individuais.

```sql
CREATE TABLE cotas_processo_cobranca (
  id UUID PRIMARY KEY,
  processoCobrancaId UUID REFERENCES processos_cobranca(id),
  cotaId UUID REFERENCES cotas(id),
  valor DECIMAL(10,2),
  diaVencimento INTEGER,
  quantidadeMeses INTEGER,
  mesesPagosRetroativo INTEGER DEFAULT 0,
  dataInicioCobranca DATE,
  status ENUM('ativo', 'pausado', 'encerrado'),
  observacao TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  UNIQUE(processoCobrancaId, cotaId)
);
```

#### 2. **Alterações em `processos_cobranca`**

**Campos Adicionados:**
- `nome` VARCHAR(255) - Nome descritivo do processo
- `tipo` ENUM('unico', 'multiplo') - Tipo do processo

**Campos Modificados (agora opcionais):**
- `cotaId` - Usado apenas para tipo='unico'
- `diaVencimento` - Movido para cotas_processo_cobranca
- `dataInicioCobranca` - Movido para cotas_processo_cobranca
- `quantidadeMeses` - Movido para cotas_processo_cobranca

#### 3. **Alterações em `cobrancas_mensais`**

**Campo Adicionado:**
- `cotaProcessoId` UUID - FK para cotas_processo_cobranca

#### 4. **Novos Endpoints da API**

```
# Gerenciar cotas em processos
GET    /api/inadimplentes/processos/:id/cotas
POST   /api/inadimplentes/processos/:id/cotas
DELETE /api/inadimplentes/processos/:id/cotas/:cotaId

# Gerenciar cota específica
GET    /api/inadimplentes/cotas-processo/:id
PUT    /api/inadimplentes/cotas-processo/:id
POST   /api/inadimplentes/cotas-processo/:id/pausar
POST   /api/inadimplentes/cotas-processo/:id/reativar
POST   /api/inadimplentes/cotas-processo/:id/encerrar
```

### Frontend

#### 1. **FormularioProcesso Refatorado**
- Seleção de tipo de processo (único ou múltiplo)
- Interface para processo de cota única (modo legado)
- Interface para processo multi-cota (modo novo)

#### 2. **Novo Componente: GerenciadorCotasProcesso**
- Adicionar/remover cotas do processo
- Editar configurações individuais de cada cota
- Visualização em tabela com todas as informações

## 🗄️ Migração de Dados

### Passo 1: Executar Migrations

```bash
# No servidor
cd /caminho/do/projeto
npm run migrate
```

As migrations irão:
1. ✅ Criar tabela `cotas_processo_cobranca`
2. ✅ Migrar dados existentes de `processos_cobranca` para `cotas_processo_cobranca`
3. ✅ Adicionar campo `cotaProcessoId` em `cobrancas_mensais`
4. ✅ Atualizar cobranças existentes com o `cotaProcessoId` correto
5. ✅ Adicionar campos `nome` e `tipo` em `processos_cobranca`

### Passo 2: Verificar Migração

```sql
-- Verificar se todos os processos foram migrados
SELECT 
  p.id,
  p.tipo,
  p.nome,
  COUNT(cpc.id) as total_cotas
FROM processos_cobranca p
LEFT JOIN cotas_processo_cobranca cpc ON p.id = cpc."processoCobrancaId"
WHERE p.status = 'ativo'
GROUP BY p.id
ORDER BY p."createdAt" DESC;

-- Verificar se todas as cobranças têm cotaProcessoId
SELECT 
  COUNT(*) as total_cobrancas,
  COUNT("cotaProcessoId") as com_cota_processo,
  COUNT(*) - COUNT("cotaProcessoId") as sem_cota_processo
FROM cobrancas_mensais;
```

### Passo 3: Validar Funcionamento

Execute os testes de validação (ver seção abaixo).

## 🧪 Testes de Validação

### 1. Testar Processos Existentes (Legado)

```bash
# Verificar se processos antigos continuam funcionando
curl -X GET http://localhost:3003/api/inadimplentes/processos \
  -H "Authorization: Bearer $TOKEN"

# Verificar geração de cobranças para processos antigos
curl -X POST http://localhost:3003/api/inadimplentes/gerar-cobrancas \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado Esperado:**
- ✅ Processos existentes aparecem com `tipo: 'unico'`
- ✅ Cobranças são geradas normalmente
- ✅ Webhooks funcionam corretamente

### 2. Testar Criação de Processo de Cota Única

```bash
curl -X POST http://localhost:3003/api/inadimplentes/processos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cotaId": "uuid-da-cota",
    "nome": "Processo Teste Único",
    "diaVencimento": 10,
    "dataInicioCobranca": "2026-02-01",
    "quantidadeMeses": 12
  }'
```

**Resultado Esperado:**
- ✅ Processo criado com `tipo: 'unico'`
- ✅ Registro criado em `cotas_processo_cobranca`
- ✅ Cobranças geradas automaticamente

### 3. Testar Criação de Processo Multi-Cota

```bash
curl -X POST http://localhost:3003/api/inadimplentes/processos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Processo Teste Múltiplas Cotas",
    "cotas": [
      {
        "cotaId": "uuid-cota-1",
        "valor": 500.00,
        "diaVencimento": 10,
        "quantidadeMeses": 12,
        "mesesPagosRetroativo": 2,
        "dataInicioCobranca": "2026-02-01",
        "observacao": "Primeira cota"
      },
      {
        "cotaId": "uuid-cota-2",
        "valor": 750.00,
        "diaVencimento": 15,
        "quantidadeMeses": 24,
        "mesesPagosRetroativo": 0,
        "dataInicioCobranca": "2026-03-01",
        "observacao": "Segunda cota"
      }
    ]
  }'
```

**Resultado Esperado:**
- ✅ Processo criado com `tipo: 'multiplo'`
- ✅ Dois registros criados em `cotas_processo_cobranca`
- ✅ Cobranças geradas para cada cota individualmente
- ✅ Cobranças retroativas criadas conforme `mesesPagosRetroativo`

### 4. Testar Gerenciamento de Cotas

```bash
# Listar cotas de um processo
curl -X GET http://localhost:3003/api/inadimplentes/processos/:processoId/cotas \
  -H "Authorization: Bearer $TOKEN"

# Adicionar cota a processo existente
curl -X POST http://localhost:3003/api/inadimplentes/processos/:processoId/cotas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cotaId": "uuid-cota-3",
    "valor": 600.00,
    "diaVencimento": 20,
    "quantidadeMeses": 18,
    "mesesPagosRetroativo": 1,
    "dataInicioCobranca": "2026-02-01"
  }'

# Atualizar configuração de cota
curl -X PUT http://localhost:3003/api/inadimplentes/cotas-processo/:cotaProcessoId \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 650.00,
    "diaVencimento": 25
  }'

# Remover cota do processo
curl -X DELETE http://localhost:3003/api/inadimplentes/processos/:processoId/cotas/:cotaId \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado Esperado:**
- ✅ Cotas listadas com estatísticas
- ✅ Cota adicionada e cobranças geradas
- ✅ Configuração atualizada
- ✅ Cota removida (apenas se não houver cobranças pendentes)

### 5. Testar Geração Automática de Cobranças

```bash
# Executar cron job manualmente
curl -X POST http://localhost:3003/api/inadimplentes/gerar-cobrancas \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado Esperado:**
- ✅ Cobranças geradas para processos tipo='unico'
- ✅ Cobranças geradas para cada cota em processos tipo='multiplo'
- ✅ Valores, vencimentos e durações respeitados individualmente

### 6. Testar Detecção de Inadimplência

```bash
# Executar detecção manual
curl -X POST http://localhost:3003/api/inadimplentes/detectar \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado Esperado:**
- ✅ Cobranças atrasadas detectadas
- ✅ Webhooks enviados com dados corretos da cota
- ✅ Payload do webhook contém informações da cota específica

## 📊 Monitoramento

### Queries Úteis

```sql
-- Estatísticas de processos por tipo
SELECT 
  tipo,
  status,
  COUNT(*) as total
FROM processos_cobranca
GROUP BY tipo, status
ORDER BY tipo, status;

-- Processos multi-cota com quantidade de cotas
SELECT 
  p.id,
  p.nome,
  p.status,
  COUNT(cpc.id) as total_cotas,
  SUM(CASE WHEN cpc.status = 'ativo' THEN 1 ELSE 0 END) as cotas_ativas
FROM processos_cobranca p
LEFT JOIN cotas_processo_cobranca cpc ON p.id = cpc."processoCobrancaId"
WHERE p.tipo = 'multiplo'
GROUP BY p.id
ORDER BY p."createdAt" DESC;

-- Cobranças por tipo de processo
SELECT 
  p.tipo,
  cm.status,
  COUNT(*) as total_cobrancas,
  SUM(cm.valor) as valor_total
FROM cobrancas_mensais cm
JOIN cotas_processo_cobranca cpc ON cm."cotaProcessoId" = cpc.id
JOIN processos_cobranca p ON cpc."processoCobrancaId" = p.id
GROUP BY p.tipo, cm.status
ORDER BY p.tipo, cm.status;
```

## 🐛 Troubleshooting

### Problema: Cobranças não estão sendo geradas para processos multi-cota

**Solução:**
1. Verificar se as cotas estão com status='ativo'
2. Verificar se `dataInicioCobranca` já passou
3. Verificar se não atingiu `quantidadeMeses`
4. Verificar logs do cron job

```sql
SELECT 
  cpc.*,
  c.cota as numero_cota
FROM cotas_processo_cobranca cpc
JOIN cotas c ON cpc."cotaId" = c.id
WHERE cpc."processoCobrancaId" = 'uuid-do-processo';
```

### Problema: Webhooks não contêm dados da cota correta

**Solução:**
Verificar se o campo `cotaProcessoId` está preenchido nas cobranças:

```sql
SELECT 
  cm.id,
  cm."cotaProcessoId",
  cpc."cotaId",
  c.cota as numero_cota
FROM cobrancas_mensais cm
LEFT JOIN cotas_processo_cobranca cpc ON cm."cotaProcessoId" = cpc.id
LEFT JOIN cotas c ON cpc."cotaId" = c.id
WHERE cm."processoCobrancaId" = 'uuid-do-processo'
ORDER BY cm."mesReferencia" DESC;
```

### Problema: Erro ao adicionar cota ao processo

**Possíveis causas:**
1. Cota já vinculada ao processo
2. Cota não existe
3. Validação de campos falhou

**Solução:**
Verificar constraints e validações:

```sql
-- Verificar se cota já está no processo
SELECT * FROM cotas_processo_cobranca 
WHERE "processoCobrancaId" = 'uuid-processo' 
AND "cotaId" = 'uuid-cota';

-- Verificar se cota existe
SELECT * FROM cotas WHERE id = 'uuid-cota';
```

## 📝 Checklist de Validação

Antes de considerar a migração completa, verifique:

- [ ] Todas as migrations executadas com sucesso
- [ ] Processos existentes migrados para `cotas_processo_cobranca`
- [ ] Todas as cobranças têm `cotaProcessoId` preenchido
- [ ] Processos antigos continuam funcionando (tipo='unico')
- [ ] Possível criar novos processos de cota única
- [ ] Possível criar novos processos multi-cota
- [ ] Geração automática de cobranças funcionando
- [ ] Detecção de inadimplência funcionando
- [ ] Webhooks enviando dados corretos
- [ ] Interface frontend carregando corretamente
- [ ] Possível adicionar/remover cotas via interface

## 🚨 Rollback (Se Necessário)

Se houver problemas críticos, execute o rollback das migrations:

```bash
# Reverter migrations (na ordem inversa)
npm run migrate:undo
npm run migrate:undo
npm run migrate:undo
npm run migrate:undo
```

Ou manualmente:

```sql
-- Remover campo cotaProcessoId
ALTER TABLE cobrancas_mensais DROP COLUMN "cotaProcessoId";

-- Remover campos nome e tipo
ALTER TABLE processos_cobranca DROP COLUMN nome;
ALTER TABLE processos_cobranca DROP COLUMN tipo;

-- Remover tabela cotas_processo_cobranca
DROP TABLE cotas_processo_cobranca;
```

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verificar logs do servidor
2. Consultar queries de monitoramento
3. Verificar documentação da API em `ROTAS_API_INADIMPLENTES.md`
4. Revisar documentação técnica em `REFATORACAO_PROCESSOS_MULTIPLAS_COTAS.md`
