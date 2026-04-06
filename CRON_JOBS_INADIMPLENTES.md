# 🕐 Documentação dos Cron Jobs - Módulo de Inadimplentes

Este documento descreve os cron jobs automatizados do módulo de inadimplentes.

---

## 📋 Resumo dos Cron Jobs

| Cron Job | Horário | Frequência | Função |
|----------|---------|------------|--------|
| **Geração de Cobranças** | 00:00 | Diária | Gera cobranças mensais automaticamente |
| **Detecção de Inadimplência** | 08:00 | Diária | Detecta inadimplentes e envia webhooks |
| **Limpeza de Logs** | 02:00 (Domingo) | Semanal | Remove logs com mais de 90 dias |

**Timezone:** America/Manaus (Horário do Amazonas - AST)

---

## 🕐 Cron Job 1: Geração Automática de Cobranças Mensais

### Configuração

```javascript
cron.schedule('0 0 * * *', async () => {
  // Gera cobranças do mês atual
}, {
  timezone: 'America/Manaus'
});
```

### Detalhes

- **Horário:** 00:00 (meia-noite)
- **Frequência:** Diária
- **Timezone:** America/Manaus
- **Função:** `cobrancaService.gerarCobrancasMensaisAutomatico()`

### O Que Faz

1. Busca todos os processos de cobrança com status `ativo`
2. Para cada processo:
   - Verifica se já passou da data de início da cobrança
   - Verifica se já existe cobrança para o mês atual
   - Se não existir, cria nova cobrança mensal
   - Define data de vencimento baseada no dia configurado
3. Retorna estatísticas:
   - Processos verificados
   - Cobranças geradas
   - Cobranças já existentes
   - Erros (se houver)

### Exemplo de Log

```
========================================
🕐 [CRON] Iniciando geração automática de cobranças mensais
⏰ Horário: 17/01/2026 00:00:00
========================================

✅ [CRON] Geração de cobranças concluída com sucesso!
📊 Processos verificados: 50
📝 Cobranças geradas: 45
⏭️  Cobranças já existentes: 5
❌ Erros: 0

📋 Detalhes:
  - Cobrança gerada para cota 123456 - R$ 500,00
  - Cobrança gerada para cota 789012 - R$ 750,00
  ...

========================================
```

### Regras de Negócio

- ✅ Só gera cobranças para processos **ativos**
- ✅ Só gera se já passou da **data de início da cobrança**
- ✅ **Não duplica** cobranças (verifica se já existe)
- ✅ Usa o **dia de vencimento** configurado no processo
- ✅ Status inicial: `pendente`

---

## 🔍 Cron Job 2: Detecção Automática de Inadimplência

### Configuração

```javascript
cron.schedule('0 8 * * *', async () => {
  // Detecta inadimplências e envia webhooks
}, {
  timezone: 'America/Manaus'
});
```

### Detalhes

- **Horário:** 08:00 (manhã)
- **Frequência:** Diária
- **Timezone:** America/Manaus
- **Função:** `inadimplenciaService.detectarInadimplenciaAutomatico()`

### O Que Faz

1. Busca todas as cobranças com status `pendente`
2. Para cada cobrança:
   - Verifica se já passou da data de vencimento
   - Se sim, atualiza status para `atrasado`
   - Calcula dias de atraso
   - Verifica se já foi notificado hoje
   - Se não, envia webhook de notificação
3. Retorna estatísticas:
   - Cobranças verificadas
   - Status atualizados
   - Webhooks enviados
   - Webhooks que falharam

### Exemplo de Log

```
========================================
🔍 [CRON] Iniciando detecção automática de inadimplência
⏰ Horário: 17/01/2026 08:00:00
========================================

✅ [CRON] Detecção de inadimplência concluída com sucesso!
📊 Cobranças verificadas: 100
🔄 Status atualizados: 15
📤 Webhooks enviados: 12
❌ Webhooks falharam: 3

📋 Detalhes:
  - Inadimplência detectada: Cota 123456 - 5 dias de atraso
  - Webhook enviado com sucesso para cota 789012
  - Webhook falhou para cota 345678 (tentará novamente)
  ...

========================================
```

### Regras de Negócio

- ✅ Só verifica cobranças com status **pendente**
- ✅ Só atualiza para **atrasado** se passou do vencimento
- ✅ **Não envia** webhook se já notificou hoje
- ✅ **Não envia** webhook se cobrança foi paga
- ✅ **Retry automático** em caso de falha (até 4 tentativas)
- ✅ Registra todas as notificações no histórico

---

## 🧹 Cron Job 3: Limpeza de Logs Antigos

### Configuração

```javascript
cron.schedule('0 2 * * 0', async () => {
  // Remove logs com mais de 90 dias
}, {
  timezone: 'America/Manaus'
});
```

### Detalhes

- **Horário:** 02:00 (madrugada)
- **Frequência:** Semanal (Domingos)
- **Timezone:** America/Manaus
- **Função:** Remove logs de webhook com mais de 90 dias

### O Que Faz

1. Calcula data limite (90 dias atrás)
2. Remove todos os logs de webhook criados antes da data limite
3. Retorna quantidade de logs removidos

### Exemplo de Log

```
========================================
🧹 [CRON] Iniciando limpeza de logs antigos
⏰ Horário: 19/01/2026 02:00:00
========================================

✅ [CRON] Limpeza concluída: 1.234 logs removidos

========================================
```

### Regras de Negócio

- ✅ Remove apenas logs com **mais de 90 dias**
- ✅ **Não afeta** cobranças ou notificações
- ✅ Mantém banco de dados **otimizado**

---

## 🔧 Execução Manual (Para Testes)

### Geração de Cobranças

```javascript
const cronInadimplentes = require('./cron/inadimplentes');

// Executar manualmente
const resultado = await cronInadimplentes.executarGeracaoManual();
console.log(resultado);
```

### Detecção de Inadimplência

```javascript
const cronInadimplentes = require('./cron/inadimplentes');

// Executar manualmente
const resultado = await cronInadimplentes.executarDeteccaoManual();
console.log(resultado);
```

### Via API (Endpoint)

```http
POST /api/inadimplentes/detectar
Authorization: Bearer <token>
```

---

## 📊 Cron Expression Reference

| Expression | Descrição |
|------------|-----------|
| `0 0 * * *` | Diariamente às 00:00 (meia-noite) |
| `0 8 * * *` | Diariamente às 08:00 (manhã) |
| `0 2 * * 0` | Semanalmente aos domingos às 02:00 |
| `*/10 * * * *` | A cada 10 minutos |
| `0 */4 * * *` | A cada 4 horas |

### Formato

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Dia da semana (0-6, 0=Domingo)
│ │ │ └───── Mês (1-12)
│ │ └─────── Dia do mês (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
```

---

## 🌍 Timezone

Todos os cron jobs usam o timezone **America/Manaus** (Horário do Amazonas - AST).

```javascript
{
  scheduled: true,
  timezone: 'America/Manaus'
}
```

### Conversão de Horários

| Timezone | Geração (00:00 AST) | Detecção (08:00 AST) |
|----------|---------------------|----------------------|
| **America/Manaus (AST)** | 00:00 | 08:00 |
| America/Sao_Paulo (BRT) | 01:00 | 09:00 |
| America/New_York (EST) | 01:00 | 09:00 |
| UTC | 04:00 | 12:00 |

---

## 🚀 Inicialização

Os cron jobs são inicializados automaticamente quando o servidor inicia:

```javascript
// server/index.js
const cronInadimplentes = require('./cron/inadimplentes');

app.listen(port, host, async (err) => {
  // ... outras inicializações

  // Inicializar cron jobs do módulo de inadimplentes
  cronInadimplentes.inicializarCronJobs();
});
```

### Log de Inicialização

```
🕐 Inicializando cron jobs do módulo de inadimplentes...
✅ Cron job de geração de cobranças agendado: Diariamente às 00:00 (America/Manaus)
✅ Cron job de detecção de inadimplência agendado: Diariamente às 08:00 (America/Manaus)
✅ Cron job de limpeza de logs agendado: Semanalmente aos domingos às 02:00 (America/Manaus)

🎉 Todos os cron jobs do módulo de inadimplentes foram inicializados!
```

---

## 📝 Logs e Monitoramento

### Logs de Sucesso

- ✅ Processos/cobranças verificados
- ✅ Operações realizadas
- ✅ Estatísticas detalhadas

### Logs de Erro

- ❌ Erro completo com stack trace
- ❌ Contexto da operação
- ❌ Timestamp

### Recomendações

1. **Monitorar logs diariamente** para identificar problemas
2. **Configurar alertas** para erros críticos
3. **Revisar estatísticas** semanalmente
4. **Ajustar horários** se necessário

---

## 🔄 Dependências

### Biblioteca

```json
{
  "node-cron": "^3.0.0"
}
```

### Instalação

```bash
npm install node-cron
```

ou

```bash
yarn add node-cron
```

---

## 🎯 Próximos Passos

1. ✅ Cron jobs implementados
2. ⏳ Testar em ambiente de desenvolvimento
3. ⏳ Configurar alertas de erro
4. ⏳ Monitorar performance
5. ⏳ Ajustar horários se necessário

---

## 📞 Suporte

Em caso de problemas com os cron jobs:

1. Verificar logs do servidor
2. Executar manualmente para debug
3. Verificar configuração de timezone
4. Verificar se node-cron está instalado
5. Verificar se services estão funcionando
