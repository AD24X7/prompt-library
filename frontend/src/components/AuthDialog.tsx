import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: 'signin' | 'signup';
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ 
  open, 
  onClose,
  onSuccess,
  initialTab = 'signin' 
}) => {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError('');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'signin' | 'signup') => {
    setTab(newValue);
    setError('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    });
  };

  const handleEmailSignIn = async () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await signIn(formData.email, formData.password);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!formData.email || !formData.password || !formData.name) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await signUp(formData.email, formData.password, formData.name);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={handleTabChange}>
            <Tab label="Sign In" value="signin" />
            <Tab label="Sign Up" value="signup" />
          </Tabs>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tab === 'signup' && (
            <TextField
              fullWidth
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={handleInputChange('name')}
              disabled={loading}
            />
          )}
          
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            disabled={loading}
          />
          
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            disabled={loading}
            helperText={tab === 'signup' ? 'Must be at least 6 characters' : ''}
          />
          
          {tab === 'signup' && (
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              disabled={loading}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={tab === 'signin' ? handleEmailSignIn : handleEmailSignUp}
          variant="contained"
          disabled={loading || !formData.email || !formData.password || (tab === 'signup' && (!formData.name || !formData.confirmPassword))}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Please wait...' : (tab === 'signin' ? 'Sign In' : 'Create Account')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};