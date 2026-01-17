-- ========================================
-- SCRIPT DE TESTE: LEAD QUENTE 🔥
-- ========================================
-- Lead com alto interesse, urgência e intenção de compra
-- Número de teste: 5511999999001
-- Nome: João Silva (Lead Quente)
-- ========================================

-- 1. Criar lead de teste
INSERT INTO dev.leads (nome, telefone, email, status, origem, consultorId, createdAt, updatedAt)
VALUES (
  'João Silva (Lead Quente)',
  '5511999999001',
  'joao.quente@teste.com',
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
  SELECT id INTO lead_id FROM dev.leads WHERE telefone = '5511999999001';
  
  -- Criar conversa
  INSERT INTO dev.conversas (leadId, chatId, consultorId, evolutionInstanceId, createdAt, updatedAt)
  VALUES (
    lead_id,
    '5511999999001@s.whatsapp.net',
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
  
  -- 3. Inserir mensagens simulando conversa QUENTE
  
  -- Mensagem 1: Lead inicia contato com urgência
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Oi! Vi seu anúncio do consórcio de imóvel. Preciso URGENTE de informações!',
    NOW() - INTERVAL '5 days',
    'msg_001_quente',
    NOW() - INTERVAL '5 days',
    NOW()
  );
  
  -- Mensagem 2: Consultor responde
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Olá João! Que bom que entrou em contato. Temos ótimas condições de consórcio. Qual valor você está procurando?',
    NOW() - INTERVAL '5 days' + INTERVAL '5 minutes',
    'msg_002_quente',
    NOW() - INTERVAL '5 days' + INTERVAL '5 minutes',
    NOW()
  );
  
  -- Mensagem 3: Lead demonstra interesse forte e orçamento
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Estou procurando um imóvel de 300 mil. Já tenho 50 mil de entrada guardado. Quero começar o quanto antes!',
    NOW() - INTERVAL '5 days' + INTERVAL '10 minutes',
    'msg_003_quente',
    NOW() - INTERVAL '5 days' + INTERVAL '10 minutes',
    NOW()
  );
  
  -- Mensagem 4: Consultor apresenta proposta
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Perfeito! Com essa entrada você consegue um ótimo plano. Posso te enviar uma simulação agora?',
    NOW() - INTERVAL '5 days' + INTERVAL '15 minutes',
    'msg_004_quente',
    NOW() - INTERVAL '5 days' + INTERVAL '15 minutes',
    NOW()
  );
  
  -- Mensagem 5: Lead confirma interesse e pede detalhes
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Sim, por favor! Quero ver as parcelas e quando posso ser contemplado. Meu aluguel vence mês que vem.',
    NOW() - INTERVAL '4 days',
    'msg_005_quente',
    NOW() - INTERVAL '4 days',
    NOW()
  );
  
  -- Mensagem 6: Consultor envia proposta
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Enviando simulação... Com 50 mil de entrada, parcelas de R$ 1.200 por 120 meses. Taxa de administração 15%.',
    NOW() - INTERVAL '4 days' + INTERVAL '5 minutes',
    'msg_006_quente',
    NOW() - INTERVAL '4 days' + INTERVAL '5 minutes',
    NOW()
  );
  
  -- Mensagem 7: Lead demonstra decisão iminente
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Perfeito! Cabe no meu orçamento. Quais documentos preciso para fechar? Posso assinar ainda essa semana?',
    NOW() - INTERVAL '3 days',
    'msg_007_quente',
    NOW() - INTERVAL '3 days',
    NOW()
  );
  
  -- Mensagem 8: Consultor lista documentos
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Sim! Precisa de: RG, CPF, comprovante de renda e residência. Posso agendar uma reunião amanhã?',
    NOW() - INTERVAL '3 days' + INTERVAL '10 minutes',
    'msg_008_quente',
    NOW() - INTERVAL '3 days' + INTERVAL '10 minutes',
    NOW()
  );
  
  -- Mensagem 9: Lead confirma reunião
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Ótimo! Amanhã às 14h está bom? Já vou separar todos os documentos. Estou muito animado!',
    NOW() - INTERVAL '2 days',
    'msg_009_quente',
    NOW() - INTERVAL '2 days',
    NOW()
  );
  
  -- Mensagem 10: Consultor confirma
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'consultor',
    'Confirmado! Te espero amanhã às 14h. Vou preparar o contrato.',
    NOW() - INTERVAL '2 days' + INTERVAL '5 minutes',
    'msg_010_quente',
    NOW() - INTERVAL '2 days' + INTERVAL '5 minutes',
    NOW()
  );
  
  -- Mensagem 11: Lead reforça interesse
  INSERT INTO dev.mensagens (conversaId, remetente, conteudo, timestamp, messageId, createdAt, updatedAt)
  VALUES (
    conversa_id,
    'lead',
    'Perfeito! Já conversei com minha esposa e ela também adorou. Vamos fechar sim!',
    NOW() - INTERVAL '1 day',
    'msg_011_quente',
    NOW() - INTERVAL '1 day',
    NOW()
  );
  
  RAISE NOTICE 'Lead QUENTE criado com sucesso! ID: %, Conversa ID: %', lead_id, conversa_id;
END $$;

-- ========================================
-- SINAIS DE LEAD QUENTE PRESENTES:
-- ========================================
-- ✅ Urgência explícita ("URGENTE", "quanto antes", "mês que vem")
-- ✅ Orçamento definido (50 mil de entrada, parcelas de 1.200)
-- ✅ Decisão iminente ("posso assinar essa semana", "vamos fechar sim")
-- ✅ Engajamento alto (respostas rápidas, múltiplas interações)
-- ✅ Perguntas sobre processo ("quais documentos", "quando posso ser contemplado")
-- ✅ Confirmação de reunião
-- ✅ Validação com terceiros ("conversei com minha esposa")
-- ✅ Sentimento positivo ("animado", "adorou", "perfeito")
-- ========================================
