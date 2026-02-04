# 📚 API - Processos com Múltiplas Cotas - Exemplos de Uso

## 🎯 Visão Geral

Esta documentação apresenta exemplos práticos de uso da API para gerenciar processos de cobrança com múltiplas cotas.

## 🔐 Autenticação

Todas as requisições requerem token JWT no header:

```bash
Authorization: Bearer seu-token-jwt-aqui
```

## 📋 Endpoints Disponíveis

### 1. Criar Processo de Cota Única (Legado)

**Endpoint:** `POST /api/inadimplentes/processos`

**Descrição:** Cria um processo tradicional vinculado a uma única cota.

**Body:**
```json
{
  "cotaId": "123e4567-e89b-12d3-a456-426614174000",
  "nome": "Processo - Cota 12345",
  "diaVencimento": 10,
  "dataInicioCobranca": "2026-02-01",
  "quantidadeMeses": 12,
  "historicoRetroativo": {
    "primeiroMesPago": "2025-12",
    "quantidadeMeses": 2
  }
}
```

**Campos:**
- `cotaId` (obrigatório): UUID da cota
- `nome` (opcional): Nome descritivo do processo
- `diaVencimento` (obrigatório): Dia do mês para vencimento (1-31)
- `dataInicioCobranca` (obrigatório): Data de início das cobranças
- `quantidadeMeses` (opcional): Total de meses a cobrar (null = ilimitado)
- `historicoRetroativo` (opcional): Importar meses já pagos

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Processo criado com sucesso",
  "dados": {
    "id": "processo-uuid",
    "tipo": "unico",
    "cotaId": "cota-uuid",
    "nome": "Processo - Cota 12345",
    "status": "ativo",
    "diaVencimento": 10,
    "dataInicioCobranca": "2026-02-01",
    "quantidadeMeses": 12,
    "createdAt": "2026-02-03T10:00:00.000Z"
  }
}
```

### 2. Criar Processo com Múltiplas Cotas (Novo)

**Endpoint:** `POST /api/inadimplentes/processos`

**Descrição:** Cria um processo que agrupa múltiplas cotas com configurações individuais.

**Body:**
```json
{
  "nome": "Processo Cliente XYZ - Múltiplas Cotas",
  "cotas": [
    {
      "cotaId": "cota-1-uuid",
      "valor": 500.00,
      "diaVencimento": 10,
      "quantidadeMeses": 12,
      "mesesPagosRetroativo": 2,
      "dataInicioCobranca": "2026-02-01",
      "observacao": "Cota principal"
    },
    {
      "cotaId": "cota-2-uuid",
      "valor": 750.00,
      "diaVencimento": 15,
      "quantidadeMeses": 24,
      "mesesPagosRetroativo": 0,
      "dataInicioCobranca": "2026-03-01",
      "observacao": "Cota adicional"
    },
    {
      "cotaId": "cota-3-uuid",
      "valor": 300.00,
      "diaVencimento": 20,
      "quantidadeMeses": null,
      "mesesPagosRetroativo": 1,
      "dataInicioCobranca": "2026-02-15",
      "observacao": "Cota ilimitada"
    }
  ]
}
```

**Campos do Array `cotas`:**
- `cotaId` (obrigatório): UUID da cota
- `valor` (obrigatório): Valor mensal da cobrança
- `diaVencimento` (obrigatório): Dia do mês para vencimento (1-31)
- `quantidadeMeses` (opcional): Total de meses (null = ilimitado)
- `mesesPagosRetroativo` (opcional): Quantidade de meses já pagos (padrão: 0)
- `dataInicioCobranca` (obrigatório): Data de início das cobranças
- `observacao` (opcional): Observações específicas da cota

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Processo criado com sucesso",
  "dados": {
    "id": "processo-uuid",
    "tipo": "multiplo",
    "nome": "Processo Cliente XYZ - Múltiplas Cotas",
    "status": "ativo",
    "createdAt": "2026-02-03T10:00:00.000Z"
  }
}
```

### 3. Listar Cotas de um Processo

**Endpoint:** `GET /api/inadimplentes/processos/:processoId/cotas`

**Query Parameters:**
- `status` (opcional): Filtrar por status (ativo, pausado, encerrado)

**Exemplo:**
```bash
GET /api/inadimplentes/processos/processo-uuid/cotas?status=ativo
```

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Cotas listadas com sucesso",
  "dados": [
    {
      "id": "cota-processo-1-uuid",
      "processoCobrancaId": "processo-uuid",
      "cotaId": "cota-1-uuid",
      "valor": 500.00,
      "diaVencimento": 10,
      "quantidadeMeses": 12,
      "mesesPagosRetroativo": 2,
      "dataInicioCobranca": "2026-02-01",
      "status": "ativo",
      "observacao": "Cota principal",
      "cota": {
        "id": "cota-1-uuid",
        "cota": "12345",
        "digito": "6",
        "grupo": "A",
        "valor": 500.00,
        "cliente": {
          "id": "cliente-uuid",
          "nome": "Cliente XYZ"
        }
      },
      "estatisticas": {
        "totalCobrancas": 14,
        "cobrancasPagas": 2,
        "cobrancasPendentes": 10,
        "cobrancasAtrasadas": 2,
        "valorTotal": 7000.00,
        "valorPago": 1000.00,
        "valorPendente": 5000.00,
        "valorAtrasado": 1000.00
      }
    }
  ]
}
```

### 4. Adicionar Cota a Processo Existente

**Endpoint:** `POST /api/inadimplentes/processos/:processoId/cotas`

**Body:**
```json
{
  "cotaId": "nova-cota-uuid",
  "valor": 600.00,
  "diaVencimento": 25,
  "quantidadeMeses": 18,
  "mesesPagosRetroativo": 1,
  "dataInicioCobranca": "2026-02-01",
  "observacao": "Nova cota adicionada"
}
```

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Cota adicionada ao processo com sucesso",
  "dados": {
    "id": "cota-processo-uuid",
    "processoCobrancaId": "processo-uuid",
    "cotaId": "nova-cota-uuid",
    "valor": 600.00,
    "diaVencimento": 25,
    "status": "ativo",
    "createdAt": "2026-02-03T10:00:00.000Z"
  }
}
```

### 5. Obter Detalhes de uma Cota no Processo

**Endpoint:** `GET /api/inadimplentes/cotas-processo/:cotaProcessoId`

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Detalhes obtidos com sucesso",
  "dados": {
    "id": "cota-processo-uuid",
    "processoCobrancaId": "processo-uuid",
    "cotaId": "cota-uuid",
    "valor": 500.00,
    "diaVencimento": 10,
    "quantidadeMeses": 12,
    "mesesPagosRetroativo": 2,
    "dataInicioCobranca": "2026-02-01",
    "status": "ativo",
    "observacao": "Cota principal",
    "cota": {
      "id": "cota-uuid",
      "cota": "12345",
      "digito": "6",
      "grupo": "A",
      "cliente": {
        "nome": "Cliente XYZ"
      }
    },
    "processo": {
      "id": "processo-uuid",
      "nome": "Processo Cliente XYZ",
      "tipo": "multiplo",
      "status": "ativo"
    },
    "estatisticas": {
      "totalCobrancas": 14,
      "cobrancasPagas": 2,
      "cobrancasPendentes": 10,
      "cobrancasAtrasadas": 2
    }
  }
}
```

### 6. Atualizar Configuração de Cota

**Endpoint:** `PUT /api/inadimplentes/cotas-processo/:cotaProcessoId`

**Body:**
```json
{
  "valor": 650.00,
  "diaVencimento": 12,
  "quantidadeMeses": 15,
  "dataInicioCobranca": "2026-02-05",
  "observacao": "Valor ajustado"
}
```

**Nota:** Apenas campos fornecidos serão atualizados.

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Configuração da cota atualizada com sucesso",
  "dados": {
    "id": "cota-processo-uuid",
    "valor": 650.00,
    "diaVencimento": 12,
    "quantidadeMeses": 15,
    "observacao": "Valor ajustado",
    "updatedAt": "2026-02-03T10:30:00.000Z"
  }
}
```

### 7. Pausar Cota no Processo

**Endpoint:** `POST /api/inadimplentes/cotas-processo/:cotaProcessoId/pausar`

**Descrição:** Pausa a geração de novas cobranças para esta cota. Cobranças existentes não são afetadas.

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Cota pausada com sucesso",
  "dados": {
    "id": "cota-processo-uuid",
    "status": "pausado",
    "updatedAt": "2026-02-03T10:00:00.000Z"
  }
}
```

### 8. Reativar Cota no Processo

**Endpoint:** `POST /api/inadimplentes/cotas-processo/:cotaProcessoId/reativar`

**Descrição:** Reativa a geração de cobranças para esta cota.

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Cota reativada com sucesso",
  "dados": {
    "id": "cota-processo-uuid",
    "status": "ativo",
    "updatedAt": "2026-02-03T10:00:00.000Z"
  }
}
```

### 9. Encerrar Cota no Processo

**Endpoint:** `POST /api/inadimplentes/cotas-processo/:cotaProcessoId/encerrar`

**Descrição:** Encerra permanentemente a cota no processo. Não gera mais cobranças.

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Cota encerrada com sucesso",
  "dados": {
    "id": "cota-processo-uuid",
    "status": "encerrado",
    "updatedAt": "2026-02-03T10:00:00.000Z"
  }
}
```

### 10. Remover Cota do Processo

**Endpoint:** `DELETE /api/inadimplentes/processos/:processoId/cotas/:cotaId`

**Descrição:** Remove completamente a cota do processo. Apenas permitido se não houver cobranças pendentes.

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Cota removida do processo com sucesso"
}
```

**Erro se houver cobranças pendentes:**
```json
{
  "sucesso": false,
  "mensagem": "Não é possível remover cota com cobranças pendentes. Encerre a cota primeiro."
}
```

## 🔄 Fluxos de Uso Comuns

### Fluxo 1: Criar Processo Multi-Cota do Zero

```bash
# 1. Criar processo com 3 cotas
curl -X POST http://localhost:3003/api/inadimplentes/processos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Processo Cliente ABC",
    "cotas": [
      {
        "cotaId": "cota-1-uuid",
        "valor": 500.00,
        "diaVencimento": 10,
        "quantidadeMeses": 12,
        "mesesPagosRetroativo": 0,
        "dataInicioCobranca": "2026-02-01"
      },
      {
        "cotaId": "cota-2-uuid",
        "valor": 750.00,
        "diaVencimento": 15,
        "quantidadeMeses": 24,
        "mesesPagosRetroativo": 0,
        "dataInicioCobranca": "2026-02-01"
      }
    ]
  }'

# 2. Listar cotas do processo
curl -X GET http://localhost:3003/api/inadimplentes/processos/$PROCESSO_ID/cotas \
  -H "Authorization: Bearer $TOKEN"

# 3. Adicionar mais uma cota
curl -X POST http://localhost:3003/api/inadimplentes/processos/$PROCESSO_ID/cotas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cotaId": "cota-3-uuid",
    "valor": 300.00,
    "diaVencimento": 20,
    "quantidadeMeses": null,
    "mesesPagosRetroativo": 0,
    "dataInicioCobranca": "2026-02-01"
  }'
```

### Fluxo 2: Ajustar Valor de Cota no Processo

```bash
# 1. Obter detalhes da cota
curl -X GET http://localhost:3003/api/inadimplentes/cotas-processo/$COTA_PROCESSO_ID \
  -H "Authorization: Bearer $TOKEN"

# 2. Atualizar valor
curl -X PUT http://localhost:3003/api/inadimplentes/cotas-processo/$COTA_PROCESSO_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 550.00,
    "observacao": "Valor reajustado em 10%"
  }'
```

### Fluxo 3: Pausar e Reativar Cota

```bash
# 1. Pausar cota temporariamente
curl -X POST http://localhost:3003/api/inadimplentes/cotas-processo/$COTA_PROCESSO_ID/pausar \
  -H "Authorization: Bearer $TOKEN"

# 2. Verificar status
curl -X GET http://localhost:3003/api/inadimplentes/cotas-processo/$COTA_PROCESSO_ID \
  -H "Authorization: Bearer $TOKEN"

# 3. Reativar quando necessário
curl -X POST http://localhost:3003/api/inadimplentes/cotas-processo/$COTA_PROCESSO_ID/reativar \
  -H "Authorization: Bearer $TOKEN"
```

### Fluxo 4: Encerrar Cota Permanentemente

```bash
# 1. Encerrar cota
curl -X POST http://localhost:3003/api/inadimplentes/cotas-processo/$COTA_PROCESSO_ID/encerrar \
  -H "Authorization: Bearer $TOKEN"

# 2. Verificar que não gera mais cobranças
curl -X GET http://localhost:3003/api/inadimplentes/cotas-processo/$COTA_PROCESSO_ID \
  -H "Authorization: Bearer $TOKEN"
```

## ⚠️ Validações e Restrições

### Criação de Processo

- ✅ Processo multi-cota deve ter pelo menos 1 cota
- ✅ Processo de cota única deve ter `cotaId` obrigatório
- ✅ Não pode ter cotas duplicadas no mesmo processo
- ✅ `diaVencimento` deve estar entre 1 e 31
- ✅ `valor` deve ser maior que 0
- ✅ `dataInicioCobranca` deve ser uma data válida

### Adição de Cota

- ✅ Cota não pode estar duplicada no processo
- ✅ Cota deve existir no sistema
- ✅ Processo deve estar ativo
- ✅ Todos os campos obrigatórios devem ser fornecidos

### Remoção de Cota

- ✅ Não pode remover se houver cobranças pendentes
- ✅ Não pode remover última cota de processo multi-cota
- ✅ Use "encerrar" se quiser manter histórico

### Atualização de Configuração

- ✅ Alterações afetam apenas cobranças futuras
- ✅ Cobranças já geradas não são alteradas
- ✅ Não pode alterar `cotaId` ou `processoCobrancaId`

## 🎨 Exemplos de Cenários Reais

### Cenário 1: Cliente com Múltiplas Propriedades

```json
{
  "nome": "Cliente João Silva - 3 Imóveis",
  "cotas": [
    {
      "cotaId": "cota-apto-101-uuid",
      "valor": 800.00,
      "diaVencimento": 10,
      "quantidadeMeses": 24,
      "dataInicioCobranca": "2026-02-01",
      "observacao": "Apartamento 101 - Edifício Central"
    },
    {
      "cotaId": "cota-apto-205-uuid",
      "valor": 650.00,
      "diaVencimento": 10,
      "quantidadeMeses": 24,
      "dataInicioCobranca": "2026-02-01",
      "observacao": "Apartamento 205 - Edifício Central"
    },
    {
      "cotaId": "cota-sala-comercial-uuid",
      "valor": 1200.00,
      "diaVencimento": 15,
      "quantidadeMeses": 36,
      "dataInicioCobranca": "2026-03-01",
      "observacao": "Sala Comercial - Centro"
    }
  ]
}
```

### Cenário 2: Processo com Cotas de Valores Diferentes

```json
{
  "nome": "Condomínio Residencial - Grupo A",
  "cotas": [
    {
      "cotaId": "cota-1-uuid",
      "valor": 500.00,
      "diaVencimento": 10,
      "quantidadeMeses": 12,
      "mesesPagosRetroativo": 3,
      "dataInicioCobranca": "2025-11-01",
      "observacao": "Cota padrão - já paga 3 meses"
    },
    {
      "cotaId": "cota-2-uuid",
      "valor": 750.00,
      "diaVencimento": 10,
      "quantidadeMeses": 12,
      "mesesPagosRetroativo": 0,
      "dataInicioCobranca": "2026-02-01",
      "observacao": "Cota premium - início recente"
    }
  ]
}
```

### Cenário 3: Migração de Processo Antigo

```json
{
  "nome": "Migração - Cliente Antigo XYZ",
  "cotas": [
    {
      "cotaId": "cota-antiga-uuid",
      "valor": 450.00,
      "diaVencimento": 5,
      "quantidadeMeses": 6,
      "mesesPagosRetroativo": 18,
      "dataInicioCobranca": "2024-08-01",
      "observacao": "Migrado do sistema antigo - 18 meses já pagos"
    }
  ]
}
```

## 📊 Respostas de Erro Comuns

### Erro 400: Validação Falhou

```json
{
  "sucesso": false,
  "mensagem": "Dia de vencimento deve estar entre 1 e 31"
}
```

### Erro 404: Recurso Não Encontrado

```json
{
  "sucesso": false,
  "mensagem": "Cota não encontrada"
}
```

### Erro 409: Conflito

```json
{
  "sucesso": false,
  "mensagem": "Esta cota já foi adicionada ao processo"
}
```

### Erro 500: Erro Interno

```json
{
  "sucesso": false,
  "mensagem": "Erro ao criar processo",
  "erro": "Detalhes do erro (apenas em desenvolvimento)"
}
```

## 🔍 Dicas de Uso

1. **Sempre valide os dados** antes de enviar para a API
2. **Use `mesesPagosRetroativo`** para importar histórico de pagamentos
3. **Configure `quantidadeMeses: null`** para cobranças ilimitadas
4. **Pause ao invés de remover** se quiser manter o histórico
5. **Use `observacao`** para documentar mudanças e contexto
6. **Monitore as estatísticas** retornadas nos endpoints de listagem
7. **Teste em ambiente de desenvolvimento** antes de usar em produção

## 📞 Suporte

Para dúvidas ou problemas:
- Consulte a documentação completa em `REFATORACAO_PROCESSOS_MULTIPLAS_COTAS.md`
- Veja o guia de migração em `GUIA_MIGRACAO_MULTIPLAS_COTAS.md`
- Verifique os logs do servidor para detalhes de erros
