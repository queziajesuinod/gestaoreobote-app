/**
 * Mapeamento centralizado de títulos personalizados para rotas
 * 
 * Use este arquivo para definir títulos customizados que serão
 * exibidos no pageTitle e no breadcrumb
 */

const pageTitles = {
  // Dashboard
  'dashvisitas': 'Dashboard de Visitas',
  'dashboard': 'Painel Principal',
  
  // Páginas Iniciais
  'blank-page': 'Página Inicial',
  'home': 'Início',
  
  // Gestão
  'gestao': 'Gestão de Equipes',
  'equipes': 'Equipes',
  'clientes': 'Clientes',
  'consultores': 'Consultores',
  'usuarios': 'Usuários',
  'perfis': 'Perfis',
  
  // Usuários
  'profile': 'Meu Perfil',
  'usuarios': 'Usuários',
  'permissoes': 'Permissões',
  
  // Rotas principais
  'app': 'Aplicação',
  
  // Adicione mais rotas personalizadas aqui
};

/**
 * Obtém o título personalizado de uma rota
 * @param {string} routeName - Nome da rota (ex: 'dashvisitas')
 * @returns {string} - Título personalizado ou nome da rota formatado
 */
export const getPageTitle = (routeName) => {
  return pageTitles[routeName] || routeName.replace('-', ' ');
};

export default pageTitles;
