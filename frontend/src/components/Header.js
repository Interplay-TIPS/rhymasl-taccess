import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Button, Menu, MenuItem } from '@mui/material';
import { Home, History, SwapHoriz } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const getCurrentMode = () => {
    if (location.pathname.startsWith('/simple-mode')) {
      return 'Simple Word Mode';
    } else if (location.pathname.startsWith('/full-mode') || location.pathname.startsWith('/story') || location.pathname.startsWith('/explore')) {
      return 'Full Story Mode';
    }
    return null;
  };

  const currentMode = getCurrentMode();

  const handleModeMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleModeMenuClose = () => {
    setAnchorEl(null);
  };

  const handleModeSwitch = (mode) => {
    handleModeMenuClose();
    if (mode === 'simple') {
      navigate('/simple-mode');
    } else if (mode === 'full') {
      navigate('/full-mode');
    } else if (mode === 'home') {
      navigate('/');
    }
  };

  return (
    <AppBar position="static" elevation={0} sx={{ backgroundColor: 'primary.main' }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="home"
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          <Home />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Rhyming ASL Story Generator
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {currentMode && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Current Mode:
              </Typography>
              <Button
                color="inherit"
                startIcon={<SwapHoriz />}
                onClick={handleModeMenuOpen}
                sx={{ 
                  textTransform: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 2,
                  px: 2,
                  py: 0.5
                }}
              >
                {currentMode}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleModeMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem onClick={() => handleModeSwitch('home')}>
                  🏠 Version Selection
                </MenuItem>
                <MenuItem onClick={() => handleModeSwitch('simple')}>
                  🎯 Simple Word Mode
                </MenuItem>
                <MenuItem onClick={() => handleModeSwitch('full')}>
                  📚 Full Story Mode
                </MenuItem>
              </Menu>
            </Box>
          )}
          
          {!currentMode && (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Choose your ASL experience
            </Typography>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
