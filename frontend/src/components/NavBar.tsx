import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Home as HomeIcon,
  Add as AddIcon,
  MenuBook as LibraryIcon,
  Category as CategoryIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { UserMenu } from './UserMenu';

export const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <HomeIcon /> },
    { path: '/prompts', label: 'Prompts', icon: <LibraryIcon /> },
    { path: '/categories', label: 'Categories', icon: <CategoryIcon /> },
    { path: '/create', label: 'Create', icon: <AddIcon /> },
  ];

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <PsychologyIcon sx={{ mr: 2 }} />
          <Typography variant="h6" noWrap component="div">
            Prompt Library
          </Typography>
          <Typography variant="subtitle2" sx={{ ml: 1, opacity: 0.8 }}>
            for Directors & PMs
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {navItems.map((item) => (
            <Tooltip key={item.path} title={item.label}>
              <IconButton
                color={location.pathname === item.path ? 'secondary' : 'inherit'}
                onClick={() => navigate(item.path)}
                sx={{ 
                  mx: 0.5,
                  backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
        
        <Button
          color="inherit"
          variant="outlined"
          onClick={() => navigate('/create')}
          sx={{ ml: 2, borderColor: 'rgba(255,255,255,0.5)' }}
        >
          New Prompt
        </Button>

        <Box sx={{ ml: 2 }}>
          <UserMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
};