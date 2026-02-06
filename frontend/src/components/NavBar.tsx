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
  Assessment as AssessmentIcon,
  MenuBook as LibraryIcon,
  Dashboard as DashboardIcon,
  Speed as SpeedIcon,
  Tag as TagIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { UserMenu } from './UserMenu';
import { useAuth } from '../contexts/AuthContext';

export const NavBar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Browse by Tags', icon: <TagIcon /> },
    { path: '/performance', label: 'Tool Performance', icon: <SpeedIcon /> },
    { path: '/prompts', label: 'All Prompts', icon: <LibraryIcon /> },
    { path: '/categories', label: 'Categories', icon: <CategoryIcon /> },
    { path: '/dashboard', label: 'Analytics', icon: <DashboardIcon /> },
  ];

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <AssessmentIcon sx={{ mr: 2 }} />
          <Typography variant="h6" noWrap component="div">
            AI Tool Analyzer
          </Typography>
          <Typography variant="subtitle2" sx={{ ml: 1, opacity: 0.8 }}>
            Performance Insights
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
        
        {user && (
          <Button
            color="inherit"
            variant="outlined"
            onClick={() => navigate('/create')}
            sx={{ ml: 2, borderColor: 'rgba(255,255,255,0.5)' }}
          >
            New Prompt
          </Button>
        )}

        <Box sx={{ ml: 2 }}>
          <UserMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
};