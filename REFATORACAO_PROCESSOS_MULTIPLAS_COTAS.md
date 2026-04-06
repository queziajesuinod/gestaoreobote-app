# 🔄 Refatoração: Processos com Múltiplas Cotas

## 📋 Objetivo

Permitir que um processo de cobrança vincule múltiplas cotas, onde cada cota pode ter:
- Valor de cobrança diferente
- Data de vencimento diferente
- Quantidade de meses total diferente
- Quantidade de meses pagos (retroativo) diferente

## 🏗️ Arquitetura Proposta

### Estrutura Atual
```
processos_cobranca (1:1) ← cotas
         ↓
   cobrancas_mensais
```

### Nova Estrutura
```
processos_cobranca (1:N) ← cotas_processo_cobranca (N:1) → cotas
                                    ↓
                              cobrancas_mensais
```

## 📊 Mudanças no Banco de Dados

### 1. Nova Tabela: `cotas_processo_cobranca`

Tabela intermediária que vincula cotas a processos com configurações individuais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `processoCobrancaId` | UUID | FK para processos_cobranca |
| `cotaId` | UUID | FK para cotas |
| `valor` | DECIMAL(10,2) | Valor da cobrança mensal desta cota |
| `diaVencimento` | INTEGER | Dia do vencimento (1-31) |
| `quantidadeMeses` | INTEGER | Quantidade de meses (null = ilimitado) |
| `mesesPagosRetroativo` | INTEGER | Meses já pagos para histórico |
| `dataInicioCobranca` | DATE | Data de início para esta cota |
| `status` | ENUM | `ativo`, `pausado`, `encerrado` |
| `observacao` | TEXT | Observações específicas |
| `createdAt` | TIMESTAMP | Data de criação |
| `updatedAt` | TIMESTAMP | Data de atualização |

**Índices:**
- `(processoCobrancaId, cotaId)` - UNIQUE
- `processoCobrancaId`
- `cotaId`
- `status`

### 2. Alterações em `processos_cobranca`

**Remover campos (movidos para cotas_processo_cobranca):**
- ~~`cotaId`~~ (agora é N:N)
- ~~`diaVencimento`~~ (específico por cota)
- ~~`dataInicioCobranca`~~ (específico por cota)
- ~~`quantidadeMeses`~~ (específico por cota)

**Manter campos:**
- `id`, `status`, `observacao`, `createdAt`, `updatedAt`

**Adicionar campos:**
- `nome` VARCHAR(255) - Nome descritivo do processo
- `tipo` ENUM('unico', 'multiplo') - Tipo do processo

### 3. Alterações em `cobrancas_mensais`

**Adicionar campo:**
- `cotaProcessoId` UUID - FK para cotas_processo_cobranca (identifica qual cota gerou a cobrança)

**Manter compatibilidade:**
- `processoCobrancaId` continua existindo
- Índice único muda de `(processoCobrancaId, mesReferencia)` para `(cotaProcessoId, mesReferencia)`

## 🔄 Migração de Dados

### Script de Migração

1. **Criar nova tabela** `cotas_processo_cobranca`
2. **Migrar dados existentes:**
   - Para cada processo em `processos_cobranca`:
     - Criar registro em `cotas_processo_cobranca` com os dados do processo
     - Vincular à cota existente
3. **Atualizar cobranças:**
   - Para cada cobrança em `cobrancas_mensais`:
     - Buscar o `cotaProcessoId` correspondente
     - Atualizar o campo `cotaProcessoId`
4. **Alterar tabela** `processos_cobranca` (remover colunas antigas)

## 🔧 Alterações no Backend

### Models

#### Novo: `CotaProcessoCobranca`
```javascript
// server/models/cotaprocessocobranca.js
- Relacionamento com ProcessoCobranca (belongsTo)
- Relacionamento com Cota (belongsTo)
- Relacionamento com CobrancaMensal (hasMany)
```

#### Atualizado: `ProcessoCobranca`
```javascript
- Remover belongsTo com Cota
- Adicionar hasMany com CotaProcessoCobranca
- Adicionar belongsToMany com Cota (through: CotaProcessoCobranca)
```

#### Atualizado: `CobrancaMensal`
```javascript
- Adicionar belongsTo com CotaProcessoCobranca
```

### Services

#### Atualizado: `inadimplencia.js`

**Funções a modificar:**
- `gerarCobrancasMensais()` - Gerar cobranças para cada cota do processo
- `buscarCobrancasAtrasadasParaNotificar()` - Incluir join com CotaProcessoCobranca
- `dispararWebhookInadimplencia()` - Buscar dados da cota correta

**Novas funções:**
- `adicionarCotaAoProcesso(processoId, cotaId, configuracao)`
- `removerCotaDoProcesso(processoId, cotaId)`
- `atualizarConfiguracaoCota(cotaProcessoId, configuracao)`
- `listarCotasDoProcesso(processoId)`

### Controllers

#### Atualizado: `inadimplencia.js`

**Novos endpoints:**
- `POST /api/inadimplentes/processos/:id/cotas` - Adicionar cota ao processo
- `DELETE /api/inadimplentes/processos/:id/cotas/:cotaId` - Remover cota
- `PUT /api/inadimplentes/processos/:id/cotas/:cotaId` - Atualizar configuração da cota
- `GET /api/inadimplentes/processos/:id/cotas` - Listar cotas do processo

**Endpoints modificados:**
- `POST /api/inadimplentes/processos` - Aceitar array de cotas
- `GET /api/inadimplentes/processos/:id` - Incluir cotas vinculadas

## 🎨 Alterações no Frontend

### Componentes a Modificar

#### `FormularioProcesso.js`
- Adicionar seleção múltipla de cotas
- Para cada cota selecionada, permitir configurar:
  - Valor
  - Dia de vencimento
  - Quantidade de meses
  - Meses pagos (retroativo)
- Modo de edição: permitir adicionar/remover cotas

#### `DetalhesProcesso.js`
- Exibir lista de cotas vinculadas
- Mostrar configurações individuais de cada cota
- Permitir editar configurações por cota
- Permitir adicionar/remover cotas

#### `ListaProcessos.js`
- Exibir quantidade de cotas vinculadas
- Indicador visual para processos multi-cota

### API Client

#### `inadimplenciaApi.js`
- Adicionar métodos para gerenciar cotas do processo:
  - `adicionarCotaAoProcesso()`
  - `removerCotaDoProcesso()`
  - `atualizarConfiguracaoCota()`
  - `listarCotasDoProcesso()`

## ✅ Compatibilidade

### Processos Existentes
- Processos com 1 cota continuam funcionando normalmente
- Migração automática para nova estrutura
- Sem perda de dados ou funcionalidades

### Novos Processos
- Podem ser criados com 1 ou N cotas
- Interface adapta-se ao tipo de processo

## 🧪 Testes

### Cenários de Teste

1. **Migração:**
   - Verificar que todos os processos existentes foram migrados
   - Verificar que cobranças mantêm vínculo correto

2. **Criação:**
   - Criar processo com 1 cota (modo legado)
   - Criar processo com múltiplas cotas
   - Validar configurações individuais

3. **Geração de Cobranças:**
   - Verificar geração para processos multi-cota
   - Verificar valores e vencimentos corretos por cota
   - Verificar histórico retroativo por cota

4. **Webhooks:**
   - Verificar envio com dados corretos da cota
   - Verificar payload com informações da cota específica

5. **Edição:**
   - Adicionar cota a processo existente
   - Remover cota de processo
   - Atualizar configurações de cota específica

## 📝 Ordem de Implementação

1. ✅ Criar migration para nova tabela
2. ✅ Criar model `CotaProcessoCobranca`
3. ✅ Atualizar models existentes
4. ✅ Criar migration de dados
5. ✅ Atualizar services
6. ✅ Atualizar controllers
7. ✅ Atualizar rotas
8. ✅ Atualizar frontend (API client)
9. ✅ Atualizar frontend (componentes)
10. ✅ Testes e validação

## 🚀 Deploy

1. Executar migrations
2. Verificar migração de dados
3. Reiniciar aplicação
4. Validar funcionamento
