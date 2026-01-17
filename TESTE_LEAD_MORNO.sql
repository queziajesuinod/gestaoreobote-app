-- ========================================
-- SCRIPT DE TESTE: LEAD MORNO 🌡️
-- ========================================
-- Lead com interesse moderado, ainda pesquisando e comparando
-- Número de teste: 5511999999002
-- Nome: Maria Santos (Lead Morno)
-- ========================================

-- 1. Criar lead de teste
INSERT INTO dev.leads (nome, telefone, email, status, origem, consultorId, createdAt, updatedAt)
VALUES (
  'Maria Santos (Lead Morno)',
  '5511999999002',
  'maria.morno@teste.com',
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
  SELECT id INTO lead_id FROM dev.leads WHERE telefone = '5511999999002';
  
  -- Criar conversa
  INSERT INTO dev.conversas (leadId, chatId, consultorId, evolutionInstanceId, createdAt, updatedAt)
  VALUES (
    lead_id,
    '5511999999002@s.whatsapp.net',
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
  
  -- 3. Inserir mensagens simulando conversa MORNA
  
  -- Mensagem 1: Lead faz pergunta genérica
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Oi, estou pesquisando sobre consórcio de imóvel. Pode me dar mais informações?',
    NOW() - INTERVAL '7 days',
    'msg_001_morno',
    NOW() - INTERVAL '7 days',
    NOW()
  );
  
  -- Mensagem 2: Consultor responde
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Olá Maria! Claro, temos várias opções de consórcio. Qual valor de imóvel você está pensando?',
    NOW() - INTERVAL '7 days' + INTERVAL '30 minutes',
    'msg_002_morno',
    NOW() - INTERVAL '7 days' + INTERVAL '30 minutes',
    NOW()
  );
  
  -- Mensagem 3: Lead responde vagamente
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Ainda não sei ao certo, estou só pesquisando. Talvez algo entre 200 e 400 mil.',
    NOW() - INTERVAL '6 days',
    'msg_003_morno',
    NOW() - INTERVAL '6 days',
    NOW()
  );
  
  -- Mensagem 4: Consultor tenta qualificar
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Entendo. Você já tem alguma entrada guardada? Isso ajuda a escolher o melhor plano.',
    NOW() - INTERVAL '6 days' + INTERVAL '1 hour',
    'msg_004_morno',
    NOW() - INTERVAL '6 days' + INTERVAL '1 hour',
    NOW()
  );
  
  -- Mensagem 5: Lead demonstra incerteza
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Tenho uns 20 mil, mas não sei se vou usar tudo. Ainda estou comparando com financiamento também.',
    NOW() - INTERVAL '5 days',
    'msg_005_morno',
    NOW() - INTERVAL '5 days',
    NOW()
  );
  
  -- Mensagem 6: Consultor apresenta vantagens
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'O consórcio tem vantagens: sem juros, parcelas menores e você pode ser contemplado antes. Quer uma simulação?',
    NOW() - INTERVAL '5 days' + INTERVAL '2 hours',
    'msg_006_morno',
    NOW() - INTERVAL '5 days' + INTERVAL '2 hours',
    NOW()
  );
  
  -- Mensagem 7: Lead adia decisão
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Interessante... Mas ainda não tenho certeza. Preciso pensar melhor. Pode me mandar por email?',
    NOW() - INTERVAL '4 days',
    'msg_007_morno',
    NOW() - INTERVAL '4 days',
    NOW()
  );
  
  -- Mensagem 8: Consultor tenta manter contato
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Claro! Vou enviar para maria.morno@teste.com. Qualquer dúvida, estou à disposição.',
    NOW() - INTERVAL '4 days' + INTERVAL '30 minutes',
    'msg_008_morno',
    NOW() - INTERVAL '4 days' + INTERVAL '30 minutes',
    NOW()
  );
  
  -- Mensagem 9: Lead responde dias depois
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Obrigada! Vi o email. Ainda estou analisando as opções. Vocês têm alguma promoção no momento?',
    NOW() - INTERVAL '2 days',
    'msg_009_morno',
    NOW() - INTERVAL '2 days',
    NOW()
  );
  
  -- Mensagem 10: Consultor responde
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Sim! Temos taxa de adesão reduzida este mês. Quer agendar uma conversa para ver os detalhes?',
    NOW() - INTERVAL '2 days' + INTERVAL '3 hours',
    'msg_010_morno',
    NOW() - INTERVAL '2 days' + INTERVAL '3 hours',
    NOW()
  );
  
  -- Mensagem 11: Lead não compromete
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Vou ver minha agenda e te aviso. Obrigada pelas informações!',
    NOW() - INTERVAL '1 day',
    'msg_011_morno',
    NOW() - INTERVAL '1 day',
    NOW()
  );
  
  RAISE NOTICE 'Lead MORNO criado com sucesso! ID: %, Conversa ID: %', lead_id, conversa_id;
END $$;

-- ========================================
-- SINAIS DE LEAD MORNO PRESENTES:
-- ========================================
-- ⚠️ Interesse moderado mas sem urgência
-- ⚠️ Ainda pesquisando e comparando opções
-- ⚠️ Orçamento indefinido ou vago
-- ⚠️ Respostas espaçadas (dias entre mensagens)
-- ⚠️ Adia decisões ("preciso pensar", "vou ver minha agenda")
-- ⚠️ Pede informações por email (menos engajamento)
-- ⚠️ Pergunta sobre promoções (sensível a preço)
-- ⚠️ Não compromete com reunião ou próximos passos
-- ⚠️ Sentimento neutro, sem empolgação
-- ========================================
