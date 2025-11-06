// app/menu.js
const menuBuilderModule = require('./menuBuilder');
const buildMenu = menuBuilderModule.default || menuBuilderModule.buildMenu || menuBuilderModule;

function resolveMenu(permissoes) {
  try {
    return buildMenu(permissoes || []);
  } catch (err) {
    console.error('Erro ao montar menu:', err);
    return [];
  }
}

function getMenu(permissoes) {
  try {
    if (permissoes && Array.isArray(permissoes)) {
      return resolveMenu(permissoes);
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return resolveMenu(user?.permissoes || []);
  } catch (err) {
    console.error('Erro ao montar menu:', err);
    return [];
  }
}

module.exports = getMenu;
module.exports.getMenu = getMenu;
