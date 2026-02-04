'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('[Migration] Iniciando migração de processos_cobranca para cotas_processo_cobranca...');

    // 1) Verificar se a tabela cotas_processo_cobranca existe
    const [tableCheck] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = :schema
        AND table_name = 'cotas_processo_cobranca'
      LIMIT 1
      `,
      { replacements: { schema: SCHEMA } }
    );

    if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
      console.log('[Migration] Tabela cotas_processo_cobranca não existe. Pulando migração.');
      return;
    }

    // 2) Verificar se já existem dados em cotas_processo_cobranca
    const [existingData] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as count FROM "${SCHEMA}"."cotas_processo_cobranca"`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingData && existingData.count > 0) {
      console.log('[Migration] Dados já existem em cotas_processo_cobranca. Pulando migração.');
      return;
    }

    // 3) Migrar dados de processos_cobranca para cotas_processo_cobranca
    const [processos] = await queryInterface.sequelize.query(
      `
      SELECT 
        id,
        "cotaId",
        "diaVencimento",
        "dataInicioCobranca",
        "quantidadeMeses",
        status,
        observacao,
        "createdAt",
        "updatedAt"
      FROM "${SCHEMA}"."processos_cobranca"
      WHERE "cotaId" IS NOT NULL
      `
    );

    console.log(`[Migration] Encontrados ${processos.length} processos para migrar`);

    if (processos.length === 0) {
      console.log('[Migration] Nenhum processo para migrar.');
      return;
    }

    // 4) Para cada processo, criar registro em cotas_processo_cobranca
    for (const processo of processos) {
      try {
        // Buscar valor da primeira cobrança deste processo (se existir)
        const [cobrancas] = await queryInterface.sequelize.query(
          `
          SELECT valor
          FROM "${SCHEMA}"."cobrancas_mensais"
          WHERE "processoCobrancaId" = :processoId
          ORDER BY "mesReferencia" ASC
          LIMIT 1
          `,
          { replacements: { processoId: processo.id } }
        );

        const valor = cobrancas && cobrancas.length > 0 ? cobrancas[0].valor : 0;

        // Inserir em cotas_processo_cobranca
        await queryInterface.sequelize.query(
          `
          INSERT INTO "${SCHEMA}"."cotas_processo_cobranca" (
            id,
            "processoCobrancaId",
            "cotaId",
            valor,
            "diaVencimento",
            "quantidadeMeses",
            "mesesPagosRetroativo",
            "dataInicioCobranca",
            status,
            observacao,
            "createdAt",
            "updatedAt"
          ) VALUES (
            gen_random_uuid(),
            :processoId,
            :cotaId,
            :valor,
            :diaVencimento,
            :quantidadeMeses,
            0,
            :dataInicio,
            :status,
            :observacao,
            :createdAt,
            :updatedAt
          )
          `,
          {
            replacements: {
              processoId: processo.id,
              cotaId: processo.cotaId,
              valor: valor,
              diaVencimento: processo.diaVencimento,
              quantidadeMeses: processo.quantidadeMeses,
              dataInicio: processo.dataInicioCobranca,
              status: processo.status,
              observacao: processo.observacao,
              createdAt: processo.createdAt,
              updatedAt: processo.updatedAt,
            },
          }
        );

        console.log(`[Migration] Processo ${processo.id} migrado com sucesso`);
      } catch (error) {
        console.error(`[Migration] Erro ao migrar processo ${processo.id}:`, error.message);
      }
    }

    // 5) Atualizar cobrancas_mensais com cotaProcessoId
    console.log('[Migration] Atualizando cobrancas_mensais com cotaProcessoId...');

    await queryInterface.sequelize.query(
      `
      UPDATE "${SCHEMA}"."cobrancas_mensais" cm
      SET "cotaProcessoId" = cpc.id
      FROM "${SCHEMA}"."cotas_processo_cobranca" cpc
      WHERE cm."processoCobrancaId" = cpc."processoCobrancaId"
      AND cm."cotaProcessoId" IS NULL
      `
    );

    console.log('[Migration] Migração concluída com sucesso!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('[Migration] Revertendo migração...');

    // Limpar cotaProcessoId das cobranças
    await queryInterface.sequelize.query(
      `
      UPDATE "${SCHEMA}"."cobrancas_mensais"
      SET "cotaProcessoId" = NULL
      WHERE "cotaProcessoId" IS NOT NULL
      `
    );

    // Limpar tabela cotas_processo_cobranca
    await queryInterface.sequelize.query(
      `DELETE FROM "${SCHEMA}"."cotas_processo_cobranca"`
    );

    console.log('[Migration] Reversão concluída!');
  },
};
