const axios = require('axios');
const crypto = require('crypto');
const { WebhookLog, ConfiguracaoWebhook } = require('../models');

class WebhookService {
  /**
   * Gerar assinatura HMAC SHA256
   */
  gerarAssinatura(payload, secretKey) {
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Verificar assinatura HMAC de callback
   */
  verificarAssinatura(payload, assinatura, secretKey) {
    const assinaturaEsperada = this.gerarAssinatura(payload, secretKey);
    return crypto.timingSafeEqual(
      Buffer.from(assinatura),
      Buffer.from(assinaturaEsperada)
    );
  }

  /**
   * Enviar webhook com retry automático
   */
  async enviarWebhook(cobrancaMensal, configuracao, tentativa = 1, evento = 'inadimplencia_detectada', extraPayload = {}) {
    const inicio = Date.now();
    let payload;
    
    try {
      // Montar payload
      payload = await this.montarPayload(cobrancaMensal, evento, extraPayload);
      
      // Adicionar assinatura se configurada
      const headers = { ...configuracao.headers };
      if (configuracao.secretKey) {
        headers['X-Webhook-Signature'] = this.gerarAssinatura(payload, configuracao.secretKey);
      }
      headers['Content-Type'] = 'application/json';

      // Enviar requisição
      const response = await axios({
        method: configuracao.metodo,
        url: configuracao.url,
        data: payload,
        headers,
        timeout: configuracao.timeout
      });

      const tempoResposta = Date.now() - inicio;

      // Registrar log de sucesso
      await WebhookLog.create({
        cobrancaMensalId: cobrancaMensal.id,
        tipo: 'saida',
        url: configuracao.url,
        payload,
        statusCode: response.status,
        resposta: response.data,
        tentativa,
        sucesso: true,
        tempoResposta
      });

      return {
        sucesso: true,
        statusCode: response.status,
        resposta: response.data,
        tempoResposta
      };

    } catch (erro) {
      const tempoResposta = Date.now() - inicio;
      
      // Registrar log de erro
      await WebhookLog.create({
        cobrancaMensalId: cobrancaMensal.id,
        tipo: 'saida',
        url: configuracao.url,
        payload,
        statusCode: erro.response?.status,
        resposta: erro.response?.data,
        erro: erro.message,
        tentativa,
        sucesso: false,
        tempoResposta
      });

      // Retry automático se não atingiu o máximo de tentativas
      if (tentativa < configuracao.maxTentativas) {
        console.log(`[Webhook] Tentativa ${tentativa} falhou. Tentando novamente...`);
        
        // Aguardar antes de tentar novamente (backoff exponencial)
        const delay = Math.min(1000 * Math.pow(2, tentativa - 1), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.enviarWebhook(cobrancaMensal, configuracao, tentativa + 1, evento);
      }

      return {
        sucesso: false,
        erro: erro.message,
        statusCode: erro.response?.status,
        resposta: erro.response?.data,
        tentativa
      };
    }
  }

  /**
   * Montar payload do webhook
   */
  async montarPayload(cobrancaMensal, evento = 'inadimplencia_detectada', extraPayload = {}) {
    // Usar associações já carregadas (evita re-fetch com imagem_base64 e N+1 queries)
    let processoCobranca = cobrancaMensal.processoCobranca;
    if (!processoCobranca) {
      processoCobranca = await cobrancaMensal.getProcessoCobranca({
        include: [
          {
            association: 'cota',
            include: [
              { association: 'cliente', attributes: ['id', 'nome', 'celular', 'email'] },
              { association: 'consultor', attributes: ['id', 'nome', 'celular', 'email'] }
            ]
          }
        ]
      });
    }

    const cota = processoCobranca.cota;
    const cliente = cota.cliente;
    const consultor = cota.consultor;

    // Calcular dias de atraso
    const hoje = new Date();
    const vencimento = new Date(cobrancaMensal.dataVencimento);
    const diasAtraso = Math.max(0, Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24)));

    // Montar payload
    const payloadBase = {
      evento,
      timestamp: new Date().toISOString(),
      cota: {
        numero: `${cota.grupo}-${cota.cota}${cota.digito ? `-${cota.digito}` : ''}`,
        grupo: cota.grupo,
        valor_parcela: parseFloat(cota.valor) || 0
      },
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.celular,
        email: cliente.email
      },
      consultor: consultor ? {
        id: consultor.id,
        nome: consultor.nome,
        telefone: consultor.celular || consultor.telefone,
        email: consultor.email
      } : null,
      cobranca: {
        id: cobrancaMensal.id,
        mes_referencia: cobrancaMensal.mesReferencia,
        valor: parseFloat(cobrancaMensal.valor),
        data_vencimento: cobrancaMensal.dataVencimento,
        dias_atraso: diasAtraso,
        status: cobrancaMensal.status
      },
      callback_url: `${process.env.API_URL || 'http://localhost:3000'}/api/inadimplentes/webhook/callback`
    };

    return { ...payloadBase, ...extraPayload };
  }

  /**
   * Processar callback do sistema externo
   */
  async processarCallback(payload, assinatura) {
    try {
      // Buscar configuração para verificar assinatura
      const configuracao = await ConfiguracaoWebhook.findOne({
        where: { ativo: true }
      });

      if (!configuracao) {
        throw new Error('Nenhuma configuração de webhook ativa encontrada');
      }

      // Verificar assinatura se configurada
      if (configuracao.secretKey && assinatura) {
        const assinaturaValida = this.verificarAssinatura(payload, assinatura, configuracao.secretKey);
        if (!assinaturaValida) {
          throw new Error('Assinatura inválida');
        }
      }

      // Registrar log do callback
      await WebhookLog.create({
        cobrancaMensalId: payload.cobranca_id,
        tipo: 'entrada',
        url: 'callback',
        payload,
        statusCode: 200,
        sucesso: true
      });

      // Atualizar notificação
      const { NotificacaoCobranca, CobrancaMensal } = require('../models');
      
      await NotificacaoCobranca.create({
        cobrancaMensalId: payload.cobranca_id,
        tipo: 'automatica',
        canal: 'webhook',
        status: payload.sucesso ? 'enviada' : 'falha',
        mensagemId: payload.mensagem_id,
        mensagem: payload.mensagem || payload.erro
      });

      // Atualizar cobrança mensal
      const cobranca = await CobrancaMensal.findByPk(payload.cobranca_id);
      if (cobranca) {
        await cobranca.update({
          ultimaNotificacaoEm: new Date(),
          totalNotificacoes: cobranca.totalNotificacoes + 1
        });
      }

      return {
        sucesso: true,
        mensagem: 'Callback processado com sucesso'
      };

    } catch (erro) {
      console.error('[Webhook] Erro ao processar callback:', erro);
      
      // Registrar log de erro
      await WebhookLog.create({
        cobrancaMensalId: payload.cobranca_id,
        tipo: 'entrada',
        url: 'callback',
        payload,
        erro: erro.message,
        sucesso: false
      });

      throw erro;
    }
  }
}

module.exports = new WebhookService();
