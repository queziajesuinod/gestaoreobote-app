import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import ExitToApp from '@mui/icons-material/ExitToApp';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import dummy from 'dan-api/dummy/dummyContents';

function UserMenu() {
  const [menuState, setMenuState] = useState({
    anchorEl: null,
    openMenu: null
  });

  const navigate = useNavigate();

  const handleMenu = (menu) => (event) => {
    const { openMenu } = menuState;
    setMenuState({
      openMenu: openMenu === menu ? null : menu,
      anchorEl: event.currentTarget
    });
  };

  const handleClose = () => {
    console.log('🚪 Fazendo logout...');
    
    // 1. Fechar o menu
    setMenuState({ anchorEl: null, openMenu: null });
    
    // 2. Limpar localStorage
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.clear();
    
    console.log('✅ localStorage limpo');
    
    // 3. Redirecionar para login
    // Usar window.location.href para forçar reload completo da página
    window.location.href = '/login';
    
    // Alternativa: usar navigate + reload
    // navigate('/login');
    // window.location.reload();
  };

  const handleProfile = () => {
    setMenuState({ anchorEl: null, openMenu: null });
    navigate('/app/profile');
  };

  const { anchorEl, openMenu } = menuState;

  return (
    <div>
      <Button onClick={handleMenu('user-setting')}>
        <Avatar alt={dummy.user.name} src={dummy.user.avatar} />
      </Button>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        open={openMenu === 'user-setting'}
        onClose={() => setMenuState({ anchorEl: null, openMenu: null })}
      >
        <MenuItem onClick={handleProfile}>Meu Perfil</MenuItem>
        <Divider />
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <ExitToApp />
          </ListItemIcon>
          Log Out
        </MenuItem>
      </Menu>
    </div>
  );
}

UserMenu.propTypes = {};

export default UserMenu;

