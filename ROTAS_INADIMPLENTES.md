# 🗺️ GUIA COMPLETO DE ROTAS - MÓDULO DE INADIMPLENTES

## 📋 TODAS AS ROTAS DISPONÍVEIS

### **1. DASHBOARD**
```
URL: /app/inadimplentes/dashboard
Método: GET
Descrição: Dashboard geral com KPIs, gráficos e cobranças atrasadas
```

**Funcionalidades:**
- KPIs: Processos Ativos, Total de Cobranças, Pagas, Atrasadas
- 4 Gráficos interativos
- Últimas 10 cobranças atrasadas
- Botões: Detectar Inadimplência, Notificar Manualmente, Exportar PDF/Excel

---

### **2. LISTA DE PROCESSOS**
```
URL: /app/inadimplentes/processos
Método: GET
Descrição: Lista todos os processos de cobrança
```

**Funcionalidades:**
- Filtros: Status (Todos, Ativo, Pausado, Encerrado)
- Busca por cliente/cota
- Paginação
- Ações: Visualizar, Editar, Pausar/Reativar, Encerrar

---

### **3. NOVO PROCESSO**
```
URL: /app/inadimplentes/processos/novo
Método: GET
Descrição: Formulário para criar novo processo
```

**Campos:**
- Cliente (autocomplete com busca)
- Grupo (filtrado por cliente)
- Cota (filtrada por cliente e grupo)
- Data Início de Cobrança
- Dia de Vencimento (1-31)
- Observação (opcional)

---

### **4. EDITAR PROCESSO**
```
URL: /app/inadimplentes/processos/:id/editar
Método: GET
Parâmetro: id do processo
Exemplo: /app/inadimplentes/processos/397ddec6-020e-4ddf-a19b-4e3608ef4b22/editar
```

**Funcionalidades:**
- Carrega dados do processo
- Permite editar todos os campos
- Validações
- Botão Salvar/Cancelar

---

### **5. DETALHES DO PROCESSO**
```
URL: /app/inadimplentes/processos/:id
Método: GET
Parâmetro: id do processo
Exemplo: /app/inadimplentes/processos/397ddec6-020e-4ddf-a19b-4e3608ef4b22
```

**Seções:**
1. **Informações do Processo**
   - Status, Data Início, Dia Vencimento
   - Botões: Editar, Pausar/Reativar, Encerrar

2. **Informações da Cota**
   - Número, Grupo, Valor, Administradora
   - Data de Aquisição

3. **Informações do Cliente**
   - Nome, CPF, Telefone, Email

4. **Informações do Consultor**
   - Nome, ID Agendor

5. **Estatísticas**
   - Total de Cobranças, Pagas, Atrasadas, Pendentes
   - Valor Total, Valor Pago, Valor em Atraso

6. **Histórico de Cobranças**
   - Lista de todas as cobranças
   - Status, Valor, Vencimento, Dias Atraso
   - Ações: Marcar como Pago, Adicionar Anotação

---

### **6. LISTA DE COBRANÇAS**
```
URL: /app/inadimplentes/cobrancas
Query Params: status (opcional)
Exemplos:
- /app/inadimplentes/cobrancas (todas)
- /app/inadimplentes/cobrancas?status=atrasado
- /app/inadimplentes/cobrancas?status=pendente
- /app/inadimplentes/cobrancas?status=pago
```

**Funcionalidades:**
- Filtros: Status (Todos, Pendente, Atrasado, Pago)
- Paginação (10, 25, 50, 100)
- Colunas: Cota, Cliente, Mês, Vencimento, Valor, Status, Dias Atraso
- Ações: Visualizar Processo, Marcar como Pago

---

### **7. CONFIGURAÇÕES DE WEBHOOK**
```
URL: /app/inadimplentes/webhook
Método: GET
Descrição: Configuração e logs de webhook
```

**Seções:**
1. **Configuração**
   - Nome (ex: "Webhook Inadimplência")
   - URL do Webhook (ex: https://seu-n8n.com/webhook/...)
   - Secret Key (HMAC SHA-256)
   - Método (POST)
   - Max Tentativas (padrão: 4)
   - Timeout (padrão: 30000ms)
   - Status (Ativo/Inativo)
   - Botões: Salvar, Testar Webhook, Gerar Secret

2. **Logs de Webhook**
   - Tabela com histórico
   - Filtros: Sucesso/Erro
   - Colunas: Data/Hora, Tipo, URL, Status, Tempo Resposta
   - Ação: Reenviar

---

## ⚠️ ROTAS INCORRETAS (NÃO FUNCIONAM)

### ❌ `/app/inadimplentes/:id`
**ERRADO!** Esta rota não existe.

**CORRETO:** `/app/inadimplentes/processos/:id`

### ❌ `/app/inadimplentes/:id/editar`
**ERRADO!** Esta rota não existe.

**CORRETO:** `/app/inadimplentes/processos/:id/editar`

---

## 🔧 COMO NAVEGAR

### **Do Dashboard:**
```javascript
// Ver processo
navigate(`/app/inadimplentes/processos/${processoId}`);

// Editar processo
navigate(`/app/inadimplentes/processos/${processoId}/editar`);

// Ver cobranças atrasadas
navigate('/app/inadimplentes/cobrancas?status=atrasado');
```

### **Da Lista de Processos:**
```javascript
// Ver detalhes
navigate(`/app/inadimplentes/processos/${processo.id}`);

// Editar
navigate(`/app/inadimplentes/processos/${processo.id}/editar`);
```

### **Da Lista de Cobranças:**
```javascript
// Ver processo da cobrança
navigate(`/app/inadimplentes/processos/${cobranca.processoCobrancaId}`);
```

---

## 📊 ESTRUTURA COMPLETA

```
/app/inadimplentes/
├── dashboard                          # Dashboard principal
├── processos                          # Lista de processos
│   ├── novo                           # Criar processo
│   ├── :id                            # Detalhes do processo
│   └── :id/editar                     # Editar processo
├── cobrancas                          # Lista de cobranças
│   └── ?status=atrasado               # Filtro por status
└── webhook                            # Configurações de webhook
```

---

## 🎯 EXEMPLOS PRÁTICOS

### **Exemplo 1: Ver Detalhes de um Processo**
```
ID do Processo: 397ddec6-020e-4ddf-a19b-4e3608ef4b22

❌ ERRADO:
http://localhost:3003/app/inadimplentes/397ddec6-020e-4ddf-a19b-4e3608ef4b22

✅ CORRETO:
http://localhost:3003/app/inadimplentes/processos/397ddec6-020e-4ddf-a19b-4e3608ef4b22
```

### **Exemplo 2: Editar um Processo**
```
ID do Processo: 397ddec6-020e-4ddf-a19b-4e3608ef4b22

❌ ERRADO:
http://localhost:3003/app/inadimplentes/397ddec6-020e-4ddf-a19b-4e3608ef4b22/editar

✅ CORRETO:
http://localhost:3003/app/inadimplentes/processos/397ddec6-020e-4ddf-a19b-4e3608ef4b22/editar
```

### **Exemplo 3: Ver Cobranças Atrasadas**
```
✅ CORRETO:
http://localhost:3003/app/inadimplentes/cobrancas?status=atrasado
```

---

## 🔍 TROUBLESHOOTING

### **Problema: "Processo não encontrado"**
**Causa:** URL incorreta (falta `/processos/`)

**Solução:** Adicione `/processos/` na URL:
```
❌ /app/inadimplentes/397ddec6...
✅ /app/inadimplentes/processos/397ddec6...
```

### **Problema: "Página em branco"**
**Causa:** Rota não existe

**Solução:** Verifique a URL no guia acima

### **Problema: "404 Not Found"**
**Causa:** ID do processo não existe no banco

**Solução:** Verifique se o processo existe na lista

---

## 📝 NOTAS IMPORTANTES

1. **Todas as rotas de processo precisam de `/processos/`**
2. **IDs são UUIDs (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)**
3. **Query params usam `?` e `&` (ex: `?status=atrasado&limite=10`)**
4. **Navegação entre páginas usa `navigate()` do React Router**

---

## ✅ CHECKLIST DE ROTAS

- [x] `/app/inadimplentes/dashboard` - Dashboard
- [x] `/app/inadimplentes/processos` - Lista de processos
- [x] `/app/inadimplentes/processos/novo` - Novo processo
- [x] `/app/inadimplentes/processos/:id` - Detalhes do processo
- [x] `/app/inadimplentes/processos/:id/editar` - Editar processo
- [x] `/app/inadimplentes/cobrancas` - Lista de cobranças
- [x] `/app/inadimplentes/webhook` - Configurações de webhook

**Total: 7 rotas principais** ✅

---

**Última atualização:** 19/01/2026  
**Branch:** inadiplentesnew  
**Status:** ✅ TODAS AS ROTAS FUNCIONANDO
