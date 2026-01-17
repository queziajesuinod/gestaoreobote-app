-- ========================================
-- SCRIPT DE TESTE: LEAD FRIO ❄️
-- ========================================
-- Lead com baixo interesse, objeções fortes ou apenas curiosidade
-- Número de teste: 5511999999003
-- Nome: Carlos Oliveira (Lead Frio)
-- ========================================

-- 1. Criar lead de teste
INSERT INTO dev.leads (nome, telefone, email, status, origem, consultorId, createdAt, updatedAt)
VALUES (
  'Carlos Oliveira (Lead Frio)',
  '5511999999003',
  'carlos.frio@teste.com',
  'novo',
  'whatsapp',
  1, -- Ajuste o consultorId conforme necessário
  NOW(),
  NOW()
)
ON CONFLICT (telefone) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  updatedAt = NOW();

-- 2. Obter ID do lead criado
DO $$
DECLARE
  lead_id INTEGER;
  conversa_id INTEGER;
BEGIN
  -- Buscar lead
  SELECT id INTO lead_id FROM dev.leads WHERE telefone = '5511999999003';
  
  -- Criar conversa
  INSERT INTO dev.conversas (leadId, chatId, consultorId, evolutionInstanceId, createdAt, updatedAt)
  VALUES (
    lead_id,
    '5511999999003@s.whatsapp.net',
    1, -- Ajuste o consultorId conforme necessário
    1, -- Ajuste o evolutionInstanceId conforme necessário
    NOW(),
    NOW()
  )
  ON CONFLICT (chatId) DO UPDATE SET
    leadId = EXCLUDED.leadId,
    updatedAt = NOW()
  RETURNING id INTO conversa_id;
  
  -- Limpar mensagens antigas
  DELETE FROM dev.mensagens WHERE conversaId = conversa_id;
  
  -- 3. Inserir mensagens simulando conversa FRIA
  
  -- Mensagem 1: Lead faz pergunta muito genérica
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Oi, quanto custa um consórcio?',
    NOW() - INTERVAL '10 days',
    'msg_001_frio',
    NOW() - INTERVAL '10 days',
    NOW()
  );
  
  -- Mensagem 2: Consultor responde
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Olá Carlos! O valor depende do bem que você quer. Está pensando em imóvel, carro ou outro bem?',
    NOW() - INTERVAL '10 days' + INTERVAL '1 hour',
    'msg_002_frio',
    NOW() - INTERVAL '10 days' + INTERVAL '1 hour',
    NOW()
  );
  
  -- Mensagem 3: Lead demora muito para responder
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Imóvel, mas só estou dando uma olhada.',
    NOW() - INTERVAL '8 days',
    'msg_003_frio',
    NOW() - INTERVAL '8 days',
    NOW()
  );
  
  -- Mensagem 4: Consultor tenta engajar
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Entendo. Qual valor de imóvel você tem em mente? Posso te passar algumas opções.',
    NOW() - INTERVAL '8 days' + INTERVAL '30 minutes',
    'msg_004_frio',
    NOW() - INTERVAL '8 days' + INTERVAL '30 minutes',
    NOW()
  );
  
  -- Mensagem 5: Lead demonstra falta de orçamento
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Não tenho nada guardado ainda. E consórcio demora muito para ser contemplado, né?',
    NOW() - INTERVAL '7 days',
    'msg_005_frio',
    NOW() - INTERVAL '7 days',
    NOW()
  );
  
  -- Mensagem 6: Consultor tenta contornar objeção
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Nem sempre! Você pode ser contemplado logo nos primeiros meses. E as parcelas são menores que financiamento.',
    NOW() - INTERVAL '7 days' + INTERVAL '2 hours',
    'msg_006_frio',
    NOW() - INTERVAL '7 days' + INTERVAL '2 hours',
    NOW()
  );
  
  -- Mensagem 7: Lead levanta mais objeções
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Mas eu ouvi falar que tem muita taxa e que às vezes a pessoa paga anos e não é contemplada...',
    NOW() - INTERVAL '6 days',
    'msg_007_frio',
    NOW() - INTERVAL '6 days',
    NOW()
  );
  
  -- Mensagem 8: Consultor explica
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Isso é mito! O consórcio é regulado pelo Banco Central. Todos são contemplados, é só questão de tempo.',
    NOW() - INTERVAL '6 days' + INTERVAL '1 hour',
    'msg_008_frio',
    NOW() - INTERVAL '6 days' + INTERVAL '1 hour',
    NOW()
  );
  
  -- Mensagem 9: Lead mostra desinteresse
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Sei... Vou pensar. Mas acho que não é para mim agora. Muito caro.',
    NOW() - INTERVAL '5 days',
    'msg_009_frio',
    NOW() - INTERVAL '5 days',
    NOW()
  );
  
  -- Mensagem 10: Consultor tenta recuperar
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Entendo sua preocupação. Posso fazer uma simulação sem compromisso para você ver que cabe no bolso?',
    NOW() - INTERVAL '5 days' + INTERVAL '30 minutes',
    'msg_010_frio',
    NOW() - INTERVAL '5 days' + INTERVAL '30 minutes',
    NOW()
  );
  
  -- Mensagem 11: Lead não responde mais ou responde vagamente
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Depois eu vejo. Valeu.',
    NOW() - INTERVAL '4 days',
    'msg_011_frio',
    NOW() - INTERVAL '4 days',
    NOW()
  );
  
  -- Mensagem 12: Consultor tenta follow-up
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Ok! Qualquer dúvida, estou aqui. Posso te adicionar na nossa lista de novidades?',
    NOW() - INTERVAL '4 days' + INTERVAL '1 hour',
    'msg_012_frio',
    NOW() - INTERVAL '4 days' + INTERVAL '1 hour',
    NOW()
  );
  
  -- Mensagem 13: Lead não responde mais (sem resposta)
  -- (Não há mensagem 13 - lead parou de responder)
  
  RAISE NOTICE 'Lead FRIO criado com sucesso! ID: %, Conversa ID: %', lead_id, conversa_id;
END $$;

-- ========================================
-- SINAIS DE LEAD FRIO PRESENTES:
-- ========================================
-- ❄️ Perguntas muito genéricas e superficiais
-- ❄️ Respostas muito espaçadas (dias/semanas)
-- ❄️ Sem orçamento ou entrada guardada
-- ❄️ Múltiplas objeções fortes
-- ❄️ Descrença no produto/serviço
-- ❄️ Falta de urgência total
-- ❄️ Respostas curtas e desinteressadas ("valeu", "depois eu vejo")
-- ❄️ Para de responder (ghosting)
-- ❄️ Sentimento negativo ou cético
-- ❄️ Não aceita simulações ou reuniões
-- ❄️ Foco apenas em preço e problemas
-- ❄️ Sem validação de terceiros ou decisores
-- ========================================
