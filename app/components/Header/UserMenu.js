import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import ExitToApp from '@mui/icons-material/ExitToApp';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import dummy from 'dan-api/dummy/dummyContents';
import { forceLogout } from '../../utils/authInterceptor';
import { getStoredUser } from '../../utils/userStorage';

function UserMenu() {
  const [menuState, setMenuState] = useState({
    anchorEl: null,
    openMenu: null
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = getStoredUser();
    if (stored && Object.keys(stored).length > 0) {
      return stored;
    }
    return dummy.user || {};
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
    
    // Fechar o menu
    setMenuState({ anchorEl: null, openMenu: null });
    
    // Usar função centralizada de logout
    forceLogout();
  };

  const handleProfile = () => {
    setMenuState({ anchorEl: null, openMenu: null });
    navigate('/app/profile');
  };

  useEffect(() => {
    const handleUserUpdated = (event) => {
      const payload = event?.detail;
      if (payload && Object.keys(payload).length > 0) {
        setCurrentUser(payload);
      } else {
        const stored = getStoredUser();
        if (stored && Object.keys(stored).length > 0) {
          setCurrentUser(stored);
        }
      }
    };

    window.addEventListener('app:user-updated', handleUserUpdated);
    return () => window.removeEventListener('app:user-updated', handleUserUpdated);
  }, []);

  const { anchorEl, openMenu } = menuState;

  return (
    <div>
      <Button onClick={handleMenu('user-setting')}>
        <Avatar alt={currentUser.name || dummy.user.name} src={currentUser.avatar || dummy.user.avatar} />
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
