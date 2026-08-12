// server/services/assistente/contexto.js
// Resolve o remetente do WhatsApp -> consultor -> token do Agendor + id do usuário Agendor.

const { Consultor, User } = require('../../models');
const { normalizarWhatsapp } = require('../consultores');

// Recebe o telefone (qualquer formato) e devolve o contexto do consultor.
// Retorna null se o número não estiver cadastrado em nenhum consultor.
async function resolverConsultorPorTelefone(telefone) {
  const numero = normalizarWhatsapp(telefone);
  if (!numero) return null;

  const consultor = await Consultor.findOne({ where: { whatsapp: numero } });
  if (!consultor) return null;

  // Token do Agendor fica no usuário vinculado ao consultor.
  const usuario = await User.findOne({ where: { consultorId: consultor.id } });

  return {
    consultor,
    consultorId: consultor.id,
    nome: consultor.nome,
    // id do usuário no Agendor (para finished_by / autoria da tarefa)
    agendorUserId: consultor.id_agendor ? Number(consultor.id_agendor) : null,
    // token individual do consultor (cai no padrão da env se não houver)
    agendorToken: usuario?.agendorToken || null
  };
}

module.exports = { resolverConsultorPorTelefone };
