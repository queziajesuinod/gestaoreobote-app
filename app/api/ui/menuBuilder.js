// app/utils/menuBuilder.js

export const buildMenu = (permissoes = []) => {
  const hasPermissao = (permissao) => permissoes.includes(permissao);
  const menu = [];

  if (hasPermissao('GESTAO') || hasPermissao('CLIENTES_ALL')) {
    const gestaoChild = [];

    if (hasPermissao('GESTAO')) {
      gestaoChild.push({
        key: 'gestao',
        name: 'Equipes',
        link: '/app/gestao',
        icon: 'ion-ios-people-outline'
      });
    }

    if (hasPermissao('CLIENTES_ALL')) {
      gestaoChild.push({
        key: 'clientes',
        name: 'Clientes',
        link: '/app/clientes',
        icon: 'ion-ios-person-outline'
      });
    }

    if (hasPermissao('GESTAO') || hasPermissao('CLIENTES_ALL')) {
      gestaoChild.push({
        key: 'cotas',
        name: 'Cotas',
        link: '/app/cotas',
        icon: 'ion-social-buffer-outline'
      });
     
    }

    if (hasPermissao('ADMIN') ) {
      gestaoChild.push({
        key: 'metas',
        name: 'Metas',
        link: '/app/metas',
        icon: 'ion-ios-flag'
      });
    }

    if (gestaoChild.length > 0) {
      menu.push({
        key: 'gestao',
        name: 'Gestão',
        icon: 'ion-ios-settings',
        child: gestaoChild
      });
    }
  } else if (hasPermissao('CLIENTES_OWN')) {
    menu.push({
      key: 'clientes',
      name: 'Clientes',
      icon: 'ion-ios-people-outline',
      child: [
        {
          key: 'clientes',
          name: 'Clientes',
          link: '/app/clientes',
          icon: 'ion-ios-people-outline'
        },
        {
          key: 'cotas',
          name: 'Cotas',
          link: '/app/cotas',
          icon: 'ion-social-buffer-outline'
        }
      ]
    });
  }

  if (hasPermissao('DASHBOARD')) {
    menu.push({
      key: 'dashboards',
      name: 'Dashboards',
      icon: 'ion-ios-pie-outline',
      child: [
        {
          key: 'dashboard_visitas',
          name: 'Visitas',
          link: '/app/dashvisitas',
          icon: 'ion-ios-pie-outline'
        }
      ]
    });
  }

  if (hasPermissao('USERS_MANAGE')) {
    menu.push({
      key: 'administracao',
      name: 'Administração',
      icon: 'ion-ios-people-outline',
      child: [
        {
          key: 'usuarios',
          name: 'Usuários',
          link: '/app/usuarios',
          icon: 'ion-ios-person-add'
        },
        {
          key: 'perfis',
          name: 'Perfis',
          link: '/app/perfis',
          icon: 'ion-ios-briefcase'
        }
      ]
    });
  }

  

  menu.push({
    key: 'leads',
    name: 'Leads',
    icon: 'ion-ios-people-outline',
    child: [
      {
        key: 'leads_lista',
        name: 'Leads',
        link: '/app/leads',
        icon: 'ion-ios-people-outline'
      },
      {
        key: 'leads_insights',
        name: 'Insights',
        link: '/app/leads-insights',
        icon: 'ion-ios-lightbulb-outline'
      },
      {
        key: 'leads_whatsapp',
        name: 'WhatsApp',
        link: '/app/configuracoes/whatsapp',
        icon: 'ion-social-whatsapp'
      }
    ]
  });

  menu.push({
    key: 'auth',
    name: 'Perfil',
    icon: 'ion-ios-contact-outline',
    child: [
      {
        key: 'auth_page',
        name: 'User Authentication',
        title: true
      },
      {
        key: 'profile',
        name: 'Profile',
        link: '/app/profile',
        icon: 'ion-ios-key-outline'
      }
    ]
  });

  return menu;
};

export default buildMenu;
