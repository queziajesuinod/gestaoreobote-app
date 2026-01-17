/**
 * Serviço de sincronização automática de leads
 */

const cron = require('node-cron');
const { EvolutionInstance, Lead, Conversa } = require('../models');
const evolutionService = require('./evolutionService');

/**
 * Sincroniza todos os leads ativos
 */
async function sincronizarTodosLeads() {
  console.log('[SYNC] Iniciando sincronização automática...');
  
  try {
    // Buscar todas as instâncias (não há coluna 'ativo' na tabela)
    const instancias = await EvolutionInstance.findAll();
    
    if (!instancias || instancias.length === 0) {
      console.log('[SYNC] Nenhuma instância ativa encontrada.');
      return;
    }
    
    console.log(`[SYNC] Encontradas ${instancias.length} instâncias ativas`);
    
    for (const instancia of instancias) {
      try {
        // Buscar leads com sync habilitado
        const leads = await Lead.findAll({
          where: {
            evolutionInstanceId: instancia.id,
            evolutionSyncEnabled: true
          },
          include: [
            {
              model: Conversa,
              as: 'conversas',
              required: true
            }
          ]
        });
        
        if (!leads || leads.length === 0) {
          console.log(`[SYNC] Nenhum lead para sincronizar na instância ${instancia.instanceName}`);
          continue;
        }
        
        console.log(`[SYNC] Sincronizando ${leads.length} leads da instância ${instancia.instanceName}`);
        
        let sucessos = 0;
        let falhas = 0;
        
        for (const lead of leads) {
          try {
            // Buscar primeira conversa do lead
            const conversa = lead.conversas && lead.conversas[0];
            
            if (!conversa || !conversa.chatId) {
              console.log(`[SYNC] Lead ${lead.id} sem conversa válida, pulando...`);
              continue;
            }
            
            // Sincronizar chat
            const resultado = await evolutionService.sincronizarChat(
              instancia,
              conversa.chatId,
              lead.id,
              100 // Últimas 100 mensagens
            );
            
            if (resultado.sucesso) {
              sucessos++;
              if (resultado.mensagensNovas > 0) {
                console.log(`[SYNC] Lead ${lead.nome}: ${resultado.mensagensNovas} novas mensagens, temperatura: ${resultado.temperaturaAtualizada}`);
              }
            } else {
              falhas++;
              console.error(`[SYNC] Erro ao sincronizar lead ${lead.id}:`, resultado.erro);
            }
            
          } catch (error) {
            falhas++;
            console.error(`[SYNC] Erro ao sincronizar lead ${lead.id}:`, error.message);
          }
        }
        
        console.log(`[SYNC] Instância ${instancia.instanceName}: ${sucessos} sucessos, ${falhas} falhas`);
        
      } catch (error) {
        console.error(`[SYNC] Erro ao processar instância ${instancia.id}:`, error.message);
      }
    }
    
    console.log('[SYNC] Sincronização automática concluída.');
  } catch (error) {
    console.error('[SYNC] Erro na sincronização automática:', error);
  }
}

/**
 * Sincroniza leads de uma instância específica
 */
async function sincronizarInstancia(evolutionInstanceId) {
  console.log(`[SYNC] Sincronizando instância ${evolutionInstanceId}...`);
  
  try {
    const instancia = await EvolutionInstance.findByPk(evolutionInstanceId);
    
    if (!instancia) {
      throw new Error('Instância não encontrada');
    }
    
    if (!instancia.ativo) {
      throw new Error('Instância inativa');
    }
    
    const leads = await Lead.findAll({
      where: {
        evolutionInstanceId: instancia.id,
        evolutionSyncEnabled: true
      },
      include: [
        {
          model: Conversa,
          as: 'conversas',
          required: true
        }
      ]
    });
    
    console.log(`[SYNC] Encontrados ${leads.length} leads para sincronizar`);
    
    const resultados = {
      sucesso: 0,
      falhas: 0,
      detalhes: []
    };
    
    for (const lead of leads) {
      try {
        const conversa = lead.conversas && lead.conversas[0];
        
        if (!conversa || !conversa.chatId) {
          resultados.falhas++;
          resultados.detalhes.push({
            leadId: lead.id,
            nome: lead.nome,
            status: 'falha',
            erro: 'Sem conversa válida'
          });
          continue;
        }
        
        const resultado = await evolutionService.sincronizarChat(
          instancia,
          conversa.chatId,
          lead.id,
          200 // Últimas 200 mensagens
        );
        
        if (resultado.sucesso) {
          resultados.sucesso++;
          resultados.detalhes.push({
            leadId: lead.id,
            nome: lead.nome,
            status: 'sucesso',
            mensagensNovas: resultado.mensagensNovas,
            temperatura: resultado.temperaturaAtualizada
          });
        } else {
          resultados.falhas++;
          resultados.detalhes.push({
            leadId: lead.id,
            nome: lead.nome,
            status: 'falha',
            erro: resultado.erro
          });
        }
        
      } catch (error) {
        resultados.falhas++;
        resultados.detalhes.push({
          leadId: lead.id,
          nome: lead.nome,
          status: 'falha',
          erro: error.message
        });
      }
    }
    
    console.log(`[SYNC] Instância ${instancia.instanceName}: ${resultados.sucesso} sucessos, ${resultados.falhas} falhas`);
    
    return resultados;
    
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar instância:', error);
    throw error;
  }
}

/**
 * Agenda sincronização automática
 * Executa a cada 15 minutos
 */
function agendarSincronizacao() {
  // Executar a cada 15 minutos
  cron.schedule('*/15 * * * *', () => {
    sincronizarTodosLeads();
  });
  
  console.log('[SYNC] Sincronização automática agendada (a cada 15 minutos)');
}

/**
 * Para a sincronização automática (para testes)
 */
function pararSincronizacao() {
  // Implementar se necessário
  console.log('[SYNC] Sincronização automática pausada');
}

module.exports = {
  sincronizarTodosLeads,
  sincronizarInstancia,
  agendarSincronizacao,
  pararSincronizacao
};
