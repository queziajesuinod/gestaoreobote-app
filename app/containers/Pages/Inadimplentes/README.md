# 📋 Módulo de Inadimplentes

## 🎯 Visão Geral

Sistema completo de gestão de inadimplência para consórcios com geração automática de cobranças, detecção de inadimplência, notificações via webhook e gerenciamento completo do ciclo de cobrança.

---

## 📦 Estrutura de Arquivos

```
Inadimplentes/
├── index.js                   # Exports dos componentes
├── ListaProcessos.js          # Lista de processos (Parte 1)
├── FormularioProcesso.js      # Formulário de cadastro/edição (Parte 2)
├── Dashboard.js               # Dashboard com estatísticas (Parte 3)
├── DetalhesProcesso.js        # Detalhes do processo (Parte 4)
├── ConfiguracoesWebhook.js    # Configurações de webhook (Parte 5)
└── README.md                  # Este arquivo
```

---

## 🎨 Páginas Implementadas

### 1. **Dashboard** (512 linhas)
- 7 cards estatísticos
- Detecção manual de inadimplência
- Lista de cobranças atrasadas
- Filtros e busca

### 2. **Lista de Processos** (717 linhas)
- Listagem completa com busca e filtros
- Ações: visualizar, editar, pausar, reativar, encerrar, excluir
- Paginação completa
- API client integrado

### 3. **Formulário de Processo** (570 linhas)
- Criação e edição de processos
- Seleção de cota (autocomplete)
- Importação de histórico retroativo
- Preview de cobranças
- Validações completas

### 4. **Detalhes do Processo** (751 linhas)
- Informações completas do processo
- Lista de cobranças geradas
- Histórico de notificações expansível
- Anotações manuais
- Ações de gerenciamento

### 5. **Configurações de Webhook** (574 linhas)
- Formulário de configuração (URL + Secret)
- Gerador de secret seguro
- Teste de webhook manual
- Estatísticas de envios
- Tabela de logs com retry
- Documentação inline completa

---

## 🔗 Rotas

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/app/inadimplentes/dashboard` | `Dashboard` | Dashboard geral |
| `/app/inadimplentes/processos` | `ListaProcessos` | Lista de processos |
| `/app/inadimplentes/processos/novo` | `FormularioProcesso` | Criar processo |
| `/app/inadimplentes/processos/:id/editar` | `FormularioProcesso` | Editar processo |
| `/app/inadimplentes/processos/:id` | `DetalhesProcesso` | Detalhes do processo |
| `/app/inadimplentes/webhook` | `ConfiguracoesWebhook` | Configurações webhook |

---

## 🔌 API Client

Localizado em: `app/services/inadimplenciaApi.js`

### Métodos Disponíveis

#### Processos
- `listarProcessos(filtros)` - Listar processos
- `obterProcesso(id)` - Obter detalhes
- `criarProcesso(dados)` - Criar processo
- `atualizarProcesso(id, dados)` - Atualizar processo
- `excluirProcesso(id)` - Excluir processo
- `pausarProcesso(id)` - Pausar processo
- `reativarProcesso(id)` - Reativar processo
- `encerrarProcesso(id)` - Encerrar processo

#### Cobranças
- `listarCobrancas(filtros)` - Listar cobranças
- `obterCobranca(id)` - Obter detalhes
- `atualizarCobranca(id, dados)` - Atualizar cobrança
- `marcarComoPaga(id)` - Marcar como paga
- `listarAtrasadas()` - Listar atrasadas

#### Notificações
- `listarNotificacoes(filtros)` - Listar notificações
- `criarNotificacao(dados)` - Criar anotação manual

#### Webhook
- `obterWebhookConfig()` - Obter configuração
- `atualizarWebhookConfig(dados)` - Atualizar configuração
- `testarWebhook()` - Testar webhook
- `listarWebhookLogs(filtros)` - Listar logs
- `reenviarWebhook(id)` - Reenviar webhook

#### Estatísticas
- `obterEstatisticas()` - Obter estatísticas gerais

#### Operações Manuais
- `gerarCobrancas()` - Gerar cobranças manualmente
- `detectarInadimplencia()` - Detectar inadimplência manualmente

---

## 🎯 Funcionalidades Principais

### ✅ Gestão de Processos
- Criar processos vinculados a cotas
- Configurar valor, vencimento e data de início
- Importar histórico retroativo
- Pausar, reativar e encerrar processos

### ✅ Geração Automática
- Cron job todo dia 1º às 00:00
- Gera cobranças mensais automaticamente
- Não gera duplicadas

### ✅ Detecção de Inadimplência
- Cron job diário às 08:00
- Detecta cobranças vencidas há > 1 dia
- Envia notificações via webhook
- Não notifica cobranças retroativas

### ✅ Sistema de Webhooks
- Assinatura HMAC SHA-256
- Retry automático (até 4 tentativas)
- Logs completos
- Teste manual

### ✅ Dashboard e Relatórios
- Estatísticas em tempo real
- Lista de atrasadas
- Detecção manual
- Filtros avançados

---

## 🔐 Permissões

O módulo requer uma das seguintes permissões:
- `GESTAO`
- `CLIENTES_ALL`
- `ADMIN`

---

## 📊 Estatísticas

### Dashboard
- Total de processos ativos
- Total de cobranças pendentes
- Valor total pendente
- Cobranças atrasadas
- Valor total atrasado
- Taxa de inadimplência (%)
- Webhooks enviados (mês atual)

### Webhook
- Total de envios
- Taxa de sucesso
- Total de falhas
- Webhooks pendentes

---

## 🚀 Como Usar

### 1. Criar Processo
1. Acesse **Inadimplentes > Processos**
2. Clique em **"Novo Processo"**
3. Preencha os dados
4. (Opcional) Importe histórico retroativo
5. Salve

### 2. Configurar Webhook
1. Acesse **Inadimplentes > Configurações Webhook**
2. Configure URL e Secret
3. Teste o webhook
4. Salve

### 3. Visualizar Detalhes
1. Acesse **Inadimplentes > Processos**
2. Clique em **"Visualizar"** (👁️)
3. Veja cobranças e notificações
4. Gerencie o processo

### 4. Monitorar Inadimplência
1. Acesse **Inadimplentes > Dashboard**
2. Visualize estatísticas
3. Execute detecção manual se necessário
4. Consulte cobranças atrasadas

---

## 🔄 Fluxo de Funcionamento

```
Criação do Processo
    ↓
Geração Automática (dia 1º às 00:00)
    ↓
Detecção de Inadimplência (diária às 08:00)
    ↓
Envio de Webhook (se vencido há > 1 dia)
    ↓
Sistema de Retry (até 4 tentativas)
    ↓
Registro em Logs
```

---

## 📝 Regras de Negócio

### Geração de Cobranças
- Apenas processos `ativo`
- Não gera duplicadas
- Cobranças retroativas marcadas como `historico: true`

### Detecção de Inadimplência
- Apenas cobranças `pendente`
- Vencimento há > 1 dia
- Não notifica cobranças retroativas
- Não notifica duplicadas

### Webhooks
- Assinatura HMAC obrigatória
- Retry automático em falha
- Máximo 4 tentativas
- Backoff exponencial

### Pagamento
- Bloqueia novas notificações
- Registra data do pagamento
- Atualiza status para `pago`

---

## 🛠️ Tecnologias

### Frontend
- React
- Material-UI (MUI)
- React Router
- Axios

### Backend
- Node.js + Express
- Sequelize ORM
- PostgreSQL
- node-cron
- crypto (HMAC)

---

## 📦 Total de Linhas

| Arquivo | Linhas |
|---------|--------|
| ListaProcessos.js | 717 |
| FormularioProcesso.js | 570 |
| Dashboard.js | 512 |
| DetalhesProcesso.js | 751 |
| ConfiguracoesWebhook.js | 574 |
| **TOTAL** | **3.124** |

---

## ✅ Status

**100% Completo e Funcional**

- ✅ 5 páginas implementadas
- ✅ 6 rotas configuradas
- ✅ API client completo
- ✅ Integração com backend
- ✅ Menu de navegação
- ✅ Documentação completa

---

## 📞 Suporte

Para dúvidas, consulte:
- Documentação principal: `MODULO_INADIMPLENTES.md` (raiz do projeto)
- Comentários inline no código
- Logs do sistema

---

**Desenvolvido com ❤️ pela equipe Reobote**
