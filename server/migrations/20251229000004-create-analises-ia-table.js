'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    
    await queryInterface.createTable('analises_ia', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      mensagemId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: { tableName: 'mensagens', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      topicos: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        allowNull: false,
        comment: 'Tópicos mencionados: preco, lance_embutido, contemplacao, etc'
      },
      objecoes: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        allowNull: false,
        comment: 'Objeções: preco_alto, demora, duvida_lance, etc'
      },
      sinaisCompra: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        allowNull: false,
        comment: 'Sinais: perguntou_documentos, pediu_simulacao, etc'
      },
      intencao: {
        type: Sequelize.ENUM('compra', 'informacao', 'reclamacao', 'outro'),
        defaultValue: 'informacao',
        allowNull: false
      },
      sentimento: {
        type: Sequelize.ENUM('positivo', 'neutro', 'negativo'),
        defaultValue: 'neutro',
        allowNull: false
      },
      scoreConfianca: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.5,
        allowNull: false,
        comment: 'Score de confiança da análise (0.0 a 1.0)'
      },
      respostaJSON: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Resposta completa da IA em JSON'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    }, { schema });
    
    // Índices
    await queryInterface.addIndex(
      { tableName: 'analises_ia', schema },
      ['mensagemId'],
      { name: 'idx_analises_mensagem', unique: true }
    );
    
    await queryInterface.addIndex(
      { tableName: 'analises_ia', schema },
      ['sentimento'],
      { name: 'idx_analises_sentimento' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.dropTable({ tableName: 'analises_ia', schema });
  }
};
