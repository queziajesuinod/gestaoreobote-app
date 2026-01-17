/**
 * Cron Jobs do Módulo de Inadimplentes
 * 
 * Automatiza:
 * 1. Geração de cobranças mensais (00:00 diariamente)
 * 2. Detecção de inadimplência (08:00 diariamente)
 */

const cron = require('node-cron');
const cobrancaService = require('../services/cobranca');
const inadimplenciaService = require('../services/inadimplencia');

/**
 * Inicializar todos os cron jobs do módulo de inadimplentes
 */
function inicializarCronJobs() {
  console.log('🕐 Inicializando cron jobs do módulo de inadimplentes...');

  // ============================================================================
  // CRON JOB 1: Geração Automática de Cobranças Mensais
  // ============================================================================
  
  /**
   * Executa: Diariamente às 00:00 (meia-noite)
   * Timezone: America/Manaus (Horário do Amazonas)
   * 
   * Função: Gera cobranças do mês atual para todos os processos ativos
   * 
   * Cron Expression: '0 0 * * *'
   * - Minuto: 0
   * - Hora: 0 (00:00)
   * - Dia do mês: * (todos)
   * - Mês: * (todos)
   * - Dia da semana: * (todos)
   */
  cron.schedule('0 0 * * *', async () => {
    console.log('\n========================================');
    console.log('🕐 [CRON] Iniciando geração automática de cobranças mensais');
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Manaus' })}`);
    console.log('========================================\n');

    try {
      const resultado = await cobrancaService.gerarCobrancasMensaisAutomatico();

      console.log('\n✅ [CRON] Geração de cobranças concluída com sucesso!');
      console.log(`📊 Processos verificados: ${resultado.processosVerificados}`);
      console.log(`📝 Cobranças geradas: ${resultado.cobrancasGeradas}`);
      console.log(`⏭️  Cobranças já existentes: ${resultado.cobrancasJaExistentes}`);
      console.log(`❌ Erros: ${resultado.erros}`);
      
      if (resultado.detalhes && resultado.detalhes.length > 0) {
        console.log('\n📋 Detalhes:');
        resultado.detalhes.forEach(detalhe => {
          console.log(`  - ${detalhe}`);
        });
      }

    } catch (error) {
      console.error('\n❌ [CRON] Erro ao gerar cobranças mensais:', error);
      console.error('Stack:', error.stack);
    }

    console.log('\n========================================\n');
  }, {
    scheduled: true,
    timezone: 'America/Manaus'
  });

  console.log('✅ Cron job de geração de cobranças agendado: Diariamente às 00:00 (America/Manaus)');

  // ============================================================================
  // CRON JOB 2: Detecção Automática de Inadimplência
  // ============================================================================
  
  /**
   * Executa: Diariamente às 08:00 (manhã)
   * Timezone: America/Manaus (Horário do Amazonas)
   * 
   * Função: Detecta inadimplências e envia webhooks de notificação
   * 
   * Cron Expression: '0 8 * * *'
   * - Minuto: 0
   * - Hora: 8 (08:00)
   * - Dia do mês: * (todos)
   * - Mês: * (todos)
   * - Dia da semana: * (todos)
   */
  cron.schedule('0 8 * * *', async () => {
    console.log('\n========================================');
    console.log('🔍 [CRON] Iniciando detecção automática de inadimplência');
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Manaus' })}`);
    console.log('========================================\n');

    try {
      const resultado = await inadimplenciaService.detectarInadimplenciaAutomatico();

      console.log('\n✅ [CRON] Detecção de inadimplência concluída com sucesso!');
      console.log(`📊 Cobranças verificadas: ${resultado.cobrancasVerificadas}`);
      console.log(`🔄 Status atualizados: ${resultado.statusAtualizados}`);
      console.log(`📤 Webhooks enviados: ${resultado.webhooksEnviados}`);
      console.log(`❌ Webhooks falharam: ${resultado.webhooksFalharam}`);
      
      if (resultado.detalhes && resultado.detalhes.length > 0) {
        console.log('\n📋 Detalhes:');
        resultado.detalhes.forEach(detalhe => {
          console.log(`  - ${detalhe}`);
        });
      }

    } catch (error) {
      console.error('\n❌ [CRON] Erro ao detectar inadimplência:', error);
      console.error('Stack:', error.stack);
    }

    console.log('\n========================================\n');
  }, {
    scheduled: true,
    timezone: 'America/Manaus'
  });

  console.log('✅ Cron job de detecção de inadimplência agendado: Diariamente às 08:00 (America/Manaus)');

  // ============================================================================
  // CRON JOB 3 (OPCIONAL): Limpeza de Logs Antigos
  // ============================================================================
  
  /**
   * Executa: Semanalmente aos domingos às 02:00
   * Timezone: America/Manaus (Horário do Amazonas)
   * 
   * Função: Remove logs de webhook com mais de 90 dias
   * 
   * Cron Expression: '0 2 * * 0'
   * - Minuto: 0
   * - Hora: 2 (02:00)
   * - Dia do mês: * (todos)
   * - Mês: * (todos)
   * - Dia da semana: 0 (domingo)
   */
  cron.schedule('0 2 * * 0', async () => {
    console.log('\n========================================');
    console.log('🧹 [CRON] Iniciando limpeza de logs antigos');
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Manaus' })}`);
    console.log('========================================\n');

    try {
      const WebhookLog = require('../models/webhooklog');
      const { Op } = require('sequelize');

      // Remover logs com mais de 90 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 90);

      const resultado = await WebhookLog.destroy({
        where: {
          createdAt: {
            [Op.lt]: dataLimite
          }
        }
      });

      console.log(`✅ [CRON] Limpeza concluída: ${resultado} logs removidos`);

    } catch (error) {
      console.error('\n❌ [CRON] Erro ao limpar logs:', error);
      console.error('Stack:', error.stack);
    }

    console.log('\n========================================\n');
  }, {
    scheduled: true,
    timezone: 'America/Manaus'
  });

  console.log('✅ Cron job de limpeza de logs agendado: Semanalmente aos domingos às 02:00 (America/Manaus)');

  console.log('\n🎉 Todos os cron jobs do módulo de inadimplentes foram inicializados!\n');
}

/**
 * Executar manualmente a geração de cobranças (para testes)
 */
async function executarGeracaoManual() {
  console.log('🔧 Executando geração de cobranças manualmente...');
  try {
    const resultado = await cobrancaService.gerarCobrancasMensaisAutomatico();
    console.log('✅ Resultado:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

/**
 * Executar manualmente a detecção de inadimplência (para testes)
 */
async function executarDeteccaoManual() {
  console.log('🔧 Executando detecção de inadimplência manualmente...');
  try {
    const resultado = await inadimplenciaService.detectarInadimplenciaAutomatico();
    console.log('✅ Resultado:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

module.exports = {
  inicializarCronJobs,
  executarGeracaoManual,
  executarDeteccaoManual
};
