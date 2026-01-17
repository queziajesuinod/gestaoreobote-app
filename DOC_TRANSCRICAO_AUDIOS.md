# 🎙️ Transcrição de Áudios do WhatsApp

## 🎯 Visão Geral

O sistema agora **transcreve automaticamente** mensagens de áudio do WhatsApp usando **Whisper API (OpenAI)** e analisa a transcrição com IA para calcular a temperatura do lead.

---

## ✨ Funcionalidades

### 1. **Transcrição Automática**
- Áudios de leads são transcritos automaticamente durante a importação
- Usa Whisper API da OpenAI (modelo `whisper-1`)
- Transcrição em português (pt)
- Armazenada no campo `transcricao` da mensagem

### 2. **Análise de IA**
- Transcrições são analisadas pela IA assim como mensagens de texto
- Detecta sinais de compra, objeções e sentimento
- Contribui para o cálculo da temperatura do lead

### 3. **Resumo de Conversa**
- Resumos incluem conteúdo de áudios transcritos
- Identificados como "[Áudio transcrito]" no resumo

---

## 🔄 Fluxo de Processamento

```
1. Lead envia áudio no WhatsApp
   ↓
2. Sistema importa mensagem (Carga Inicial/Sincronização)
   ↓
3. Sistema detecta que é áudio (tipoMidia = 'audio')
   ↓
4. Sistema baixa áudio da URL
   ↓
5. Sistema envia para Whisper API
   ↓
6. Whisper retorna transcrição em texto
   ↓
7. Sistema salva transcrição no banco
   ↓
8. IA analisa transcrição (sinais, objeções, sentimento)
   ↓
9. Sistema recalcula temperatura do lead
   ↓
10. Transcrição aparece no histórico e resumo
```

---

## 📊 Exemplo Prático

### Mensagem de Áudio

**Lead envia áudio:**
> 🎤 "Oi, tô interessado em consórcio de carro. Quanto custa uma carta de 50 mil? Preciso urgente porque meu carro quebrou."

### Processamento

1. **Importação:**
   ```javascript
   {
     tipoMidia: 'audio',
     conteudo: '[Áudio]',
     urlMidia: 'https://evolution.../audio.ogg',
     transcricao: null  // Ainda não transcrito
   }
   ```

2. **Transcrição:**
   ```javascript
   {
     tipoMidia: 'audio',
     conteudo: '[Áudio]',
     urlMidia: 'https://evolution.../audio.ogg',
     transcricao: 'Oi, tô interessado em consórcio de carro. Quanto custa uma carta de 50 mil? Preciso urgente porque meu carro quebrou.'
   }
   ```

3. **Análise de IA:**
   ```javascript
   {
     topicos: ['consorcio_carro', 'orcamento'],
     sinaisCompra: ['interesse_explicito', 'urgencia', 'orcamento_definido'],
     objecoes: [],
     sentimento: 'positivo',
     scoreConfianca: 0.9
   }
   ```

4. **Temperatura:**
   ```
   Score base: 50
   + Sinais de compra: +30 (interesse + urgência + orçamento)
   + Sentimento positivo: +10
   = 90 (QUENTE 🔥)
   ```

---

## 🔧 Detalhes Técnicos

### Modelo de Mensagem

```javascript
{
  id: UUID,
  conversaId: UUID,
  remetente: 'lead',
  conteudo: '[Áudio]',
  tipoMidia: 'audio',
  urlMidia: 'https://...',
  transcricao: 'Texto transcrito aqui',  // ← NOVO
  analisadaPorIA: true,
  timestamp: Date
}
```

### Serviço de Transcrição

**Arquivo:** `server/services/transcricaoService.js`

**Funções principais:**
- `transcreverAudioDeURL(url)` - Transcreve áudio de uma URL
- `transcreverMensagemSeNecessario(mensagem)` - Transcreve mensagem se for áudio
- `transcreverLoteMensagens(mensagens)` - Processa lote de mensagens

**Exemplo de uso:**
```javascript
const transcricaoService = require('./transcricaoService');

const resultado = await transcricaoService.transcreverAudioDeURL(
  'https://evolution.../audio.ogg'
);

if (resultado.sucesso) {
  console.log('Transcrição:', resultado.transcricao);
}
```

### Integração no Evolution Service

**Arquivo:** `server/services/evolutionService.js`

**Modificação:** Linhas 670-682

```javascript
// Transcrever áudio se necessário
if (remetente === 'lead' && tipoMidia === 'audio' && urlMidia) {
  try {
    const transcricaoService = require('./transcricaoService');
    const resultadoTranscricao = await transcricaoService.transcreverMensagemSeNecessario(novaMensagem);
    
    if (resultadoTranscricao.sucesso) {
      console.log(`[SYNC] Áudio transcrito: ${resultadoTranscricao.transcricao.substring(0, 50)}...`);
    }
  } catch (error) {
    console.error('[SYNC] Erro ao transcrever áudio:', error.message);
  }
}
```

### Análise de IA Modificada

**Arquivo:** `server/services/ia.js`

**Modificação 1:** Análise de mensagens (linhas 684-714)

```javascript
// Analisar com IA se for mensagem do lead (texto ou áudio transcrito)
if (remetente === 'lead') {
  let conteudoParaAnalisar = null;
  
  if (tipoMidia === 'texto') {
    conteudoParaAnalisar = conteudo;
  } else if (tipoMidia === 'audio' && novaMensagem.transcricao) {
    conteudoParaAnalisar = novaMensagem.transcricao;  // ← USA TRANSCRIÇÃO
  }
  
  if (conteudoParaAnalisar) {
    const analise = await iaService.analisarMensagem(conteudoParaAnalisar);
    // ... salvar análise
  }
}
```

**Modificação 2:** Resumo de conversa (linhas 282-292)

```javascript
// Montar contexto da conversa (usando transcrição para áudios)
const contexto = conversa.mensagens
  .map(m => {
    let conteudo = m.conteudo;
    // Usar transcrição se for áudio e tiver transcrição
    if (m.tipoMidia === 'audio' && m.transcricao) {
      conteudo = `[Áudio transcrito]: ${m.transcricao}`;
    }
    return `[${m.remetente}]: ${conteudo}`;
  })
  .join('\n');
```

---

## 📋 Quando a Transcrição Acontece?

### ✅ Transcrição Automática

A transcrição acontece automaticamente em:

1. **Carga Inicial**
   - Todos os áudios de leads são transcritos
   - Pode demorar mais tempo (muitos áudios)

2. **Sincronizar Mensagens**
   - Áudios novos são transcritos
   - Apenas mensagens recentes

3. **Importar por Contato**
   - Áudios do contato importado são transcritos
   - Até 1000 mensagens

### ❌ Quando NÃO Transcreve

- Áudios de **consultores** (apenas leads)
- Áudios **sem URL** de mídia
- Áudios **já transcritos** (não duplica)
- Mensagens de **texto, imagem, vídeo, documento**

---

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
OPENAI_API_KEY=sk-...  # Chave da OpenAI (já configurada)
```

### Dependências

```bash
npm install openai axios
```

---

## 📊 Logs e Monitoramento

### Logs de Transcrição

```bash
[TRANSCRICAO] Baixando áudio de: https://evolution.../audio.ogg
[TRANSCRICAO] Áudio salvo em: /tmp/audio_1234567890.ogg
[TRANSCRICAO] Transcrevendo áudio: /tmp/audio_1234567890.ogg
[TRANSCRICAO] Transcrição concluída: Oi, tô interessado em consórcio...
[TRANSCRICAO] Arquivo temporário removido: /tmp/audio_1234567890.ogg
[SYNC] Áudio transcrito: Oi, tô interessado em consórcio de carro...
```

### Logs de Erro

```bash
[TRANSCRICAO] Erro ao baixar áudio: timeout of 30000ms exceeded
[TRANSCRICAO] Erro ao transcrever áudio: Invalid file format
[SYNC] Erro ao transcrever áudio: Falha ao baixar áudio
```

---

## 🎯 Benefícios

### 1. **Análise Completa**
- Áudios agora contribuem para temperatura do lead
- Não perde informações importantes em áudios

### 2. **Automação**
- Não precisa ouvir áudios manualmente
- Transcrição automática durante importação

### 3. **Insights Melhores**
- IA analisa conteúdo de áudios
- Resumos incluem áudios transcritos

### 4. **Busca e Filtro**
- Pode buscar por palavras-chave em áudios
- Transcrições são texto pesquisável

---

## ⚠️ Limitações

### 1. **Custo**
- Whisper API cobra por minuto de áudio
- Muitos áudios = custo maior

### 2. **Tempo**
- Transcrição demora alguns segundos por áudio
- Importação fica mais lenta com muitos áudios

### 3. **Qualidade**
- Depende da qualidade do áudio
- Ruído ou sotaque forte pode afetar precisão

### 4. **Idioma**
- Configurado para português (pt)
- Outros idiomas podem ter precisão menor

---

## 🧪 Como Testar

### Teste 1: Importar Contato com Áudio

1. Envie áudio para um contato no WhatsApp
2. Vá em **Importar por Contato**
3. Busque e importe o contato
4. Aguarde processamento
5. Abra detalhes do lead
6. Verifique se áudio foi transcrito no histórico

### Teste 2: Verificar Temperatura

1. Lead com áudio contendo **sinais de compra**
2. Verifique se temperatura aumentou
3. Lead com áudio contendo **objeções**
4. Verifique se temperatura diminuiu

### Teste 3: Verificar Resumo

1. Abra detalhes de lead com áudios
2. Verifique se resumo menciona conteúdo dos áudios
3. Procure por "[Áudio transcrito]" no resumo

---

## 🔍 Consultas SQL

### Ver mensagens de áudio transcritas

```sql
SELECT 
  m.id,
  l.nome AS lead_nome,
  m.conteudo,
  m.transcricao,
  m.timestamp
FROM dev.mensagens m
JOIN dev.conversas c ON c.id = m.conversaId
JOIN dev.leads l ON l.id = c.leadId
WHERE m.tipoMidia = 'audio'
  AND m.transcricao IS NOT NULL
ORDER BY m.timestamp DESC
LIMIT 20;
```

### Estatísticas de transcrição

```sql
SELECT 
  COUNT(*) AS total_audios,
  COUNT(transcricao) AS audios_transcritos,
  COUNT(transcricao) * 100.0 / COUNT(*) AS percentual_transcrito
FROM dev.mensagens
WHERE tipoMidia = 'audio';
```

### Áudios não transcritos

```sql
SELECT 
  m.id,
  l.nome AS lead_nome,
  m.urlMidia,
  m.timestamp
FROM dev.mensagens m
JOIN dev.conversas c ON c.id = m.conversaId
JOIN dev.leads l ON l.id = c.leadId
WHERE m.tipoMidia = 'audio'
  AND m.transcricao IS NULL
  AND m.urlMidia IS NOT NULL
ORDER BY m.timestamp DESC;
```

---

## 📝 Resumo

| Aspecto | Detalhes |
|---------|----------|
| **O que faz** | Transcreve áudios automaticamente |
| **Quando** | Durante importação de mensagens |
| **API usada** | Whisper API (OpenAI) |
| **Idioma** | Português (pt) |
| **Análise** | IA analisa transcrição como texto |
| **Temperatura** | Áudios contribuem para o score |
| **Resumo** | Inclui conteúdo de áudios |
| **Custo** | Por minuto de áudio transcrito |

---

## 🎉 Resultado Final

Agora o sistema analisa **100% das mensagens dos leads**, incluindo:

- ✅ Mensagens de texto
- ✅ Mensagens de áudio (transcritas)
- ✅ Imagens (conteúdo visual não analisado ainda)
- ✅ Documentos (conteúdo não analisado ainda)
- ✅ Vídeos (conteúdo não analisado ainda)

**A temperatura do lead é mais precisa** porque considera todo o conteúdo da conversa, não apenas texto! 🚀

---

**Última atualização:** 2026-01-17  
**Versão:** 1.0
