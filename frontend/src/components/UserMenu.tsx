import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { AuthDialog } from './AuthDialog';

export const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<'signin' | 'signup'>('signin');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignIn = () => {
    setAuthDialogTab('signin');
    setAuthDialogOpen(true);
    handleMenuClose();
  };

  const handleSignUp = () => {
    setAuthDialogTab('signup');
    setAuthDialogOpen(true);
    handleMenuClose();
  };

  const handleSignOut = () => {
    signOut();
    handleMenuClose();
  };

  if (!user) {
    return (
      <>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleSignIn}
            startIcon={<LoginIcon />}
          >
            Sign In
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSignUp}
          >
            Sign Up
          </Button>
        </Box>

        <AuthDialog
          open={authDialogOpen}
          onClose={() => setAuthDialogOpen(false)}
          initialTab={authDialogTab}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleMenuOpen}
        sx={{ 
          textTransform: 'none',
          color: 'text.primary',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar
            src={user.avatar}
            sx={{ width: 32, height: 32 }}
          >
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box display="flex" flexDirection="column" alignItems="flex-start">
            <Typography variant="body2" fontWeight={500}>
              {user.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem disabled>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">{user.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign Out</ListItemText>
        </MenuItem>
      </Menu>

      <AuthDialog
        open={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
        initialTab={authDialogTab}
      />
    </>
  );
};