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
  Divider,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Google as GoogleIcon,
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
  const { signIn, signUp, signInWithGoogle, signInWithOutlook, sendVerificationCode, verifyCode } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    verificationCode: '',
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
    setSuccess('');
    setVerificationStep(false);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      verificationCode: '',
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
    } catch (error) {
      setError('Invalid email or password');
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
    } catch (error) {
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      setError('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      await sendVerificationCode(formData.email);
      setVerificationEmail(formData.email);
      setVerificationStep(true);
      setSuccess('Verification code sent to your email');
    } catch (error) {
      setError('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!formData.verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      await verifyCode(verificationEmail, formData.verificationCode);
      await signIn(verificationEmail);
      onSuccess?.();
      onClose();
    } catch (error) {
      setError('Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (error) {
      setError('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleOutlookSignIn = async () => {
    try {
      setLoading(true);
      await signInWithOutlook();
      onSuccess?.();
      onClose();
    } catch (error) {
      setError('Failed to sign in with Outlook');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    setVerificationStep(false);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      verificationCode: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {verificationStep ? 'Verify Email' : (tab === 'signin' ? 'Sign In' : 'Create Account')}
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

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {verificationStep ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We've sent a 6-digit verification code to {verificationEmail}
            </Typography>
            <TextField
              fullWidth
              label="Verification Code"
              value={formData.verificationCode}
              onChange={handleInputChange('verificationCode')}
              placeholder="123456"
              inputProps={{ maxLength: 6 }}
              sx={{ mb: 2 }}
            />
          </Box>
        ) : (
          <>
            <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }}>
              <Tab label="Sign In" value="signin" />
              <Tab label="Sign Up" value="signup" />
            </Tabs>

            {/* OAuth Options */}
            <Box sx={{ mb: 3 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleSignIn}
                disabled={loading}
                sx={{ mb: 1 }}
              >
                Continue with Google
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleOutlookSignIn}
                disabled={loading}
                sx={{ mb: 1 }}
              >
                Continue with Outlook
              </Button>
            </Box>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                or
              </Typography>
            </Divider>

            {/* Email Form */}
            <Box component="form" onSubmit={(e) => e.preventDefault()}>
              {tab === 'signup' && (
                <TextField
                  fullWidth
                  label="Full Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  sx={{ mb: 2 }}
                  required
                />
              )}

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                sx={{ mb: 2 }}
                required
              />

              {tab === 'signin' ? (
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  sx={{ mb: 2 }}
                />
              ) : (
                <>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    helperText="At least 6 characters"
                    sx={{ mb: 2 }}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    sx={{ mb: 2 }}
                    required
                  />
                </>
              )}
            </Box>

            {tab === 'signin' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Don't have a password? 
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleSendVerificationCode}
                  disabled={loading}
                >
                  Send verification code to email
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={
            verificationStep 
              ? handleVerifyCode
              : tab === 'signin'
                ? formData.password 
                  ? handleEmailSignIn 
                  : handleSendVerificationCode
                : handleEmailSignUp
          }
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading 
            ? 'Loading...' 
            : verificationStep 
              ? 'Verify & Sign In'
              : tab === 'signin'
                ? formData.password 
                  ? 'Sign In'
                  : 'Send Code'
                : 'Create Account'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};