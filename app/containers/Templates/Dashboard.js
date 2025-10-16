import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { GuideSlider } from 'dan-components';
import { toggleAction, openAction, playTransitionAction } from 'dan-redux/modules/ui';
import { useLocation, useNavigate } from 'react-router-dom';
import LeftSidebarLayout from './layouts/LeftSidebarLayout';
import LeftSidebarBigLayout from './layouts/LeftSidebarBigLayout';
import DropMenuLayout from './layouts/DropMenuLayout';
import MegaMenuLayout from './layouts/MegaMenuLayout';
import useStyles from './appStyles-jss';

function Dashboard({ changeMode, children }) {
  const { classes, cx } = useStyles();
  const [openGuide, setOpenGuide] = useState(false);
  const [appHeight, setAppHeight] = useState(0);

  const dispatch = useDispatch();
  const navigate = useNavigate(); // ✅ substitui o history antigo
  const location = useLocation();

  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const pageLoaded = useSelector((state) => state.ui.pageLoaded);
  const mode = useSelector((state) => state.ui.type);
  const gradient = useSelector((state) => state.ui.gradient);
  const deco = useSelector((state) => state.ui.decoration);
  const layout = useSelector((state) => state.ui.layout);
  const bgPosition = useSelector((state) => state.ui.bgPosition);

  useEffect(() => {
    setAppHeight(window.innerHeight + 112);

    const currentPath = location.pathname;
    dispatch(openAction({ initialLocation: currentPath }));

    setTimeout(() => {
      window.scrollTo(0, 0);
      dispatch(playTransitionAction(true));
    }, 500);
  }, [location]);

  const handleOpenGuide = () => setOpenGuide(true);
  const handleCloseGuide = () => setOpenGuide(false);

  const titleException = ['/app'];
  const parts = location.pathname.split('/');
  const place = parts[parts.length - 1].replace('-', ' ');

  // ✅ função para substituir o uso de history.push()
  const goTo = (path, replace = false) => {
    if (replace) navigate(path, { replace: true });
    else navigate(path);
  };

  return (
    <div
      style={{ minHeight: appHeight }}
      className={cx(
        classes.appFrameInner,
        layout === 'top-navigation' || layout === 'mega-menu' ? classes.topNav : classes.sideNav,
        mode === 'dark' ? 'dark-mode' : 'light-mode'
      )}
    >
      <GuideSlider openGuide={openGuide} closeGuide={handleCloseGuide} />
      {layout === 'left-sidebar' && (
        <LeftSidebarLayout
          goTo={goTo} // 🔁 substitui history
          toggleDrawer={() => dispatch(toggleAction())}
          loadTransition={(payload) => dispatch(playTransitionAction(payload))}
          changeMode={changeMode}
          sidebarOpen={sidebarOpen}
          pageLoaded={pageLoaded}
          mode={mode}
          gradient={gradient}
          deco={deco}
          bgPosition={bgPosition}
          place={place}
          titleException={titleException}
          handleOpenGuide={handleOpenGuide}
        >
          {children}
        </LeftSidebarLayout>
      )}

      {layout === 'big-sidebar' && (
        <LeftSidebarBigLayout
          goTo={goTo}
          toggleDrawer={() => dispatch(toggleAction())}
          loadTransition={(payload) => dispatch(playTransitionAction(payload))}
          changeMode={changeMode}
          sidebarOpen={sidebarOpen}
          pageLoaded={pageLoaded}
          gradient={gradient}
          deco={deco}
          bgPosition={bgPosition}
          mode={mode}
          place={place}
          titleException={titleException}
          handleOpenGuide={handleOpenGuide}
        >
          {children}
        </LeftSidebarBigLayout>
      )}

      {layout === 'top-navigation' && (
        <DropMenuLayout
          goTo={goTo}
          toggleDrawer={() => dispatch(toggleAction())}
          loadTransition={(payload) => dispatch(playTransitionAction(payload))}
          changeMode={changeMode}
          sidebarOpen={sidebarOpen}
          pageLoaded={pageLoaded}
          mode={mode}
          gradient={gradient}
          deco={deco}
          bgPosition={bgPosition}
          place={place}
          titleException={titleException}
          handleOpenGuide={handleOpenGuide}
        >
          {children}
        </DropMenuLayout>
      )}

      {layout === 'mega-menu' && (
        <MegaMenuLayout
          goTo={goTo}
          toggleDrawer={() => dispatch(toggleAction())}
          loadTransition={(payload) => dispatch(playTransitionAction(payload))}
          changeMode={changeMode}
          sidebarOpen={sidebarOpen}
          pageLoaded={pageLoaded}
          mode={mode}
          gradient={gradient}
          deco={deco}
          bgPosition={bgPosition}
          place={place}
          titleException={titleException}
          handleOpenGuide={handleOpenGuide}
        >
          {children}
        </MegaMenuLayout>
      )}
    </div>
  );
}

Dashboard.propTypes = {
  children: PropTypes.node.isRequired,
  changeMode: PropTypes.func.isRequired
};

export default Dashboard;
