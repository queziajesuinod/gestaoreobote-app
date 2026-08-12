// server/services/assistente/contexto.js
// Resolve o remetente do WhatsApp -> consultor -> token do Agendor + id do usuário Agendor.

const { Op } = require('sequelize');
const { Consultor, User } = require('../../models');
const { normalizarWhatsapp } = require('../consultores');

// Gera variações de um número BR pra casar com/sem o 9º dígito de celular.
// Ex.: 5567992625560 (13) <-> 556792625560 (12). Também tenta com/sem DDI 55.
function variantesTelefoneBR(numero) {
  const set = new Set();
  if (!numero) return [];
  set.add(numero);

  // com e sem DDI 55
  const semDDI = numero.startsWith('55') ? numero.slice(2) : numero;
  const comDDI = numero.startsWith('55') ? numero : `55${numero}`;
  set.add(semDDI);
  set.add(comDDI);

  // para cada forma (com/sem DDI), alterna o 9º dígito (DDD + [9] + 8 dígitos)
  const alternar9 = (n, temDDI) => {
    const ddi = temDDI ? '55' : '';
    const resto = temDDI ? n.slice(2) : n; // DDD + local
    if (resto.length < 10) return;         // precisa de DDD(2) + >=8
    const ddd = resto.slice(0, 2);
    let local = resto.slice(2);
    if (local.length === 9 && local.startsWith('9')) {
      set.add(`${ddi}${ddd}${local.slice(1)}`); // remove o 9
    } else if (local.length === 8) {
      set.add(`${ddi}${ddd}9${local}`);         // adiciona o 9
    }
  };
  alternar9(comDDI, true);
  alternar9(semDDI, false);

  return [...set].filter(Boolean);
}

// Recebe o telefone (qualquer formato) e devolve o contexto do consultor.
// Retorna null se o número não estiver cadastrado em nenhum consultor.
async function resolverConsultorPorTelefone(telefone) {
  const numero = normalizarWhatsapp(telefone);
  if (!numero) return null;

  const variantes = variantesTelefoneBR(numero);
  const consultor = await Consultor.findOne({ where: { whatsapp: { [Op.in]: variantes } } });
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

module.exports = { resolverConsultorPorTelefone, variantesTelefoneBR };
