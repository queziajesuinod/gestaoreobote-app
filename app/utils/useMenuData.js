import { useEffect, useState } from 'react';
import menuModule from 'dan-api/ui/menu';
import { getStoredUser } from './userStorage';

const buildMenu = menuModule?.default || menuModule?.getMenu || menuModule;

const readMenu = () => {
  try {
    const user = getStoredUser();
    const permissoes = user?.permissoes || [];
    return buildMenu(permissoes);
  } catch (error) {
    console.error('Erro ao montar menu dinamicamente:', error);
    return [];
  }
};

const useMenuData = () => {
  const [menu, setMenu] = useState(readMenu);

  useEffect(() => {
    const updateMenu = () => {
      setMenu(readMenu());
    };

    window.addEventListener('storage', updateMenu);
    window.addEventListener('app:user-updated', updateMenu);

    return () => {
      window.removeEventListener('storage', updateMenu);
      window.removeEventListener('app:user-updated', updateMenu);
    };
  }, []);

  return menu;
};

export default useMenuData;
