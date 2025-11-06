const metasService = require('../services/metas');

async function listar(req, res) {
  try {
    const metas = await metasService.listarMetas();
    return res.status(200).json({ sucesso: true, dados: metas });
  } catch (error) {
    console.error('❌ Erro ao listar metas:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar metas', erro: error.message });
  }
}

async function criar(req, res) {
  try {
    const meta = await metasService.criarMeta(req.body);
    return res.status(201).json({ sucesso: true, mensagem: 'Meta criada com sucesso.', dados: meta });
  } catch (error) {
    console.error('❌ Erro ao criar meta:', error);
    return res.status(400).json({ sucesso: false, mensagem: error.message });
  }
}

async function atualizar(req, res) {
  try {
    const { id } = req.params;
    const meta = await metasService.atualizarMeta(id, req.body);
    return res.status(200).json({ sucesso: true, mensagem: 'Meta atualizada com sucesso.', dados: meta });
  } catch (error) {
    console.error('❌ Erro ao atualizar meta:', error);
    return res.status(400).json({ sucesso: false, mensagem: error.message });
  }
}

async function deletar(req, res) {
  try {
    const { id } = req.params;
    const resultado = await metasService.deletarMeta(id);
    return res.status(200).json({ sucesso: true, mensagem: resultado.mensagem });
  } catch (error) {
    console.error('❌ Erro ao deletar meta:', error);
    return res.status(400).json({ sucesso: false, mensagem: error.message });
  }
}

async function buscarPorReferencia(req, res) {
  try {
    const { dataInicio, dataFim } = req.query;
    if (!dataInicio) {
      return res.status(400).json({ sucesso: false, mensagem: 'Parâmetro "dataInicio" é obrigatório.' });
    }

    const meta = await metasService.buscarMetaPorReferencia(dataInicio, dataFim);
    return res.status(200).json({ sucesso: true, meta: meta || null });
  } catch (error) {
    console.error('❌ Erro ao buscar meta por referência:', error);
    return res.status(400).json({ sucesso: false, mensagem: error.message });
  }
}

module.exports = {
  listar,
  criar,
  atualizar,
  deletar,
  buscarPorReferencia
};
