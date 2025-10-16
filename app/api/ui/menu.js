module.exports = [
  {
    key: 'gestao',
    name: 'Gestão',
    icon: 'ion-ios-paper-outline',
    child: [
      {
        key: 'gestao',
        name: 'Gestão de Equipes',
        link: '/app/gestao',
        icon: 'ion-ios-document-outline',
      },
      {
        key: 'dashboard',
        name: 'Dashboard',
        link: '/app/dashvisitas',
        icon: 'ion-ios-home-outline',
      }
    ]
  },
  {
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
        icon: 'ion-ios-key-outline'
      },
    ]
  }
];
