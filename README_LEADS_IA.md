# Módulo de Leads com Análise de IA

## Visão Geral

O módulo de Leads foi refatorado para focar exclusivamente na **importação e análise de conversas do WhatsApp via Evolution API**. A funcionalidade de envio de mensagens foi removida para criar uma ferramenta poderosa de inteligência de vendas, que classifica leads e gera insights acionáveis para a equipe comercial.

---

## Funcionalidades Principais

### ✅ Importação e Sincronização

- **Importação Manual:** Crie leads manualmente com validação automática do número no WhatsApp.
- **Importação em Lote:** Importe múltiplos contatos do Evolution API de uma só vez.
- **Sincronização de Histórico:** Baixe o histórico completo de mensagens para cada lead importado.
- **Sincronização Automática:** O sistema sincroniza novas mensagens a cada **15 minutos** automaticamente, mantendo os dados sempre atualizados.

### ✅ Análise de IA

- **Análise por Mensagem:** Cada mensagem do lead é analisada individualmente para extrair informações valiosas.
- **Detecção de Sinais de Compra:** Identifica automaticamente quando um cliente demonstra intenção de compra (ex: pediu simulação, perguntou sobre documentos).
- **Identificação de Objeções:** Detecta as principais barreiras e preocupações levantadas pelo cliente (ex: preço alto, demora na contemplação).
- **Análise de Sentimento:** Classifica cada mensagem como positiva, negativa ou neutra.
- **Cálculo de Temperatura:** Um score de 0 a 100 que representa o quão "quente" o lead está, baseado em uma combinação de fatores.
- **Geração de Resumos:** A IA cria um resumo conciso da conversa, destacando os pontos mais importantes.

### ✅ Dashboard de Insights

- **Visão Geral do Consultor:** Um painel consolidado que mostra a performance geral, com distribuição de leads por temperatura.
- **Top Sinais e Objeções:** Gráficos que mostram os sinais de compra e objeções mais comuns em todos os seus leads.
- **Leads que Precisam de Atenção:** Uma lista inteligente que prioriza leads quentes sem interação recente ou leads mornos que estão esfriando.
- **Tópicos Mais Discutidos:** Uma nuvem de tags com os assuntos mais recorrentes nas conversas.

### ❌ Funcionalidades Removidas (Intencionalmente)

- **Envio de Mensagens:** A plataforma agora é focada em análise. O envio de mensagens deve ser feito diretamente pelo WhatsApp.
- **Sugestão de Respostas:** Removido para simplificar o foco em análise e insights.

---

## Como Usar

### 1. Configurar a Instância Evolution

- Vá para **Configurações > Evolution API**.
- Preencha a URL da sua API, o nome da instância e a API Key.
- Ative a opção **"Sincronizar Automaticamente"** para manter os leads atualizados.

### 2. Importar Leads

- **Opção 1 (Recomendado): Importar em Lote**
  - Vá para **Leads > Importar do WhatsApp**.
  - Selecione os contatos que deseja analisar.
  - Clique em **"Importar Selecionados"**. O sistema irá baixar o histórico de conversas e iniciar a análise.

- **Opção 2: Criar Manualmente**
  - Vá para **Leads > Novo Lead**.
  - Preencha as informações. O sistema irá validar o número e preparar para a sincronização.

### 3. Analisar os Insights

- **Dashboard do Consultor:**
  - Acesse **Leads > Dashboard** para ter uma visão geral da sua carteira de leads.
  - Identifique rapidamente quais são os leads mais promissores e quais precisam de mais atenção.

- **Detalhes do Lead:**
  - Clique em um lead para ver uma análise aprofundada.
  - Visualize a **temperatura**, os **sinais de compra**, as **objeções** e as **recomendações da IA**.
  - Leia o histórico de conversas com as análises de sentimento destacadas.

### 4. Sincronização

- **Automática:** Ocorre a cada 15 minutos em segundo plano.
- **Manual:** Na página de detalhes do lead, clique no botão **"Sincronizar Mensagens"** para forçar uma atualização imediata.

---

## Classificação de Temperatura

| Classificação | Score | Descrição |
| :--- | :--- | :--- |
| **🔥 Quente** | 70-100 | Alta probabilidade de conversão. Contato imediato recomendado. |
| **🌡️ Morno** | 40-69 | Interesse moderado. Lead precisa ser nutrido. |
| **❄️ Frio** | 0-39 | Baixo interesse ou inativo. Considere reengajamento. |

---

## API Endpoints (Para Desenvolvedores)

```
# Leads
GET    /api/leads/:consultorId              # Listar leads
GET    /api/leads/detalhes/:leadId          # Obter detalhes de um lead
POST   /api/leads/                          # Criar lead manual
PUT    /api/leads/:leadId                   # Atualizar lead

# Sincronização e Importação
POST   /api/leads/:leadId/sincronizar       # Sincronizar mensagens de um lead
POST   /api/leads/consultor/:id/importar-lote # Importar múltiplos contatos

# Insights
GET    /api/leads/:leadId/insights          # Obter insights de um lead específico
GET    /api/leads/consultor/:id/insights    # Obter insights consolidados de um consultor
```

---

**Data da Refatoração:** 2026-01-16  
**Repositório:** `queziajesuinod/gestaoreobote-app`  
**Branch:** `leads_IA`
