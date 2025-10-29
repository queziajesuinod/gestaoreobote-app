// app/utils/menuBuilder.js

export const buildMenu = (permissoes = []) => {
    const menu = [];

    // Gestão
   // if (permissoes.includes('GESTAO') || permissoes.includes('ADMIN')) {
        menu.push({
            key: 'gestao',
            name: 'Gestão',
            icon: 'ion-ios-settings',
            child: [
                {
                    key: 'gestao',
                    name: 'Equipes',
                    link: '/app/gestao',
                    icon: 'ion-ios-people-outline',
                }
            ].filter(Boolean),
        });
   // }
    //if (permissoes.includes('DASHBOARD') || permissoes.includes('ADMIN')) {
        menu.push({
            key: 'dashboards',
            name: 'Dashboards',
            icon: 'ion-ios-pie-outline',
            child: [{
                key: 'dashboard_visitas',
                name: 'Visitas',
                link: '/app/dashvisitas',
                icon: 'ion-ios-pie-outline',
            }
            ]
        });

    //}


    // Perfil / Autenticação
    menu.push({
        key: 'auth',
        name: 'Perfil',
        icon: 'ion-ios-contact-outline',
        child: [
            {
                key: 'auth_page',
                name: 'User Authentication',
                title: true,
            },
            {
                key: 'profile',
                name: 'Profile',
                link: '/app/profile',
                icon: 'ion-ios-key-outline',
            },
        ],
    });

    return menu;
};
