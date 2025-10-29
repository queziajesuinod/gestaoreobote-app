// app/menu.js
const { buildMenu } = require('./menuBuilder');

function getMenu() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const permissoes = user?.permissoes || [];

    return buildMenu(permissoes);
  } catch (err) {
    console.error('Erro ao montar menu:', err);
    return [];
  }
}

module.exports = getMenu();
