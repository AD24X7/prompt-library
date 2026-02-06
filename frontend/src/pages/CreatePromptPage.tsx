import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { promptsApi, categoriesApi } from '../utils/api';
import { Category } from '../types';
import { extractPlaceholders, validatePromptText } from '../utils/promptUtils';
import { useAuth } from '../contexts/AuthContext';

interface FormData {
  title: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  apps: string[];
  urls: string[];
}

export const CreatePromptPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<string[]>([]);
  const [promptErrors, setPromptErrors] = useState<string[]>([]);
  const [appInput, setAppInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    prompt: '',
    category: '',
    tags: [],
    difficulty: 'medium',
    estimatedTime: '5-10 minutes',
    apps: [],
    urls: [],
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(Array.isArray(response.data) ? response.data : (response as unknown) as Category[]);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError('');
    
    // Auto-detect placeholders when prompt text changes
    if (field === 'prompt') {
      const placeholders = extractPlaceholders(value);
      const errors = validatePromptText(value);
      setDetectedPlaceholders(placeholders);
      setPromptErrors(errors);
    }
  };

  const handleSelectChange = (field: keyof FormData) => (event: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError('');
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleAddApp = () => {
    const trimmedApp = appInput.trim();
    if (trimmedApp && !formData.apps.includes(trimmedApp)) {
      setFormData(prev => ({
        ...prev,
        apps: [...prev.apps, trimmedApp],
      }));
      setAppInput('');
    }
  };

  const handleRemoveApp = (appToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      apps: prev.apps.filter(app => app !== appToRemove),
    }));
  };

  const handleAddUrl = () => {
    const trimmedUrl = urlInput.trim();
    if (trimmedUrl && !formData.urls.includes(trimmedUrl)) {
      // Basic URL validation
      try {
        new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
        setFormData(prev => ({
          ...prev,
          urls: [...prev.urls, trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`],
        }));
        setUrlInput('');
      } catch (e) {
        setError('Please enter a valid URL');
      }
    }
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      urls: prev.urls.filter(url => url !== urlToRemove),
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.prompt.trim()) {
      setError('Prompt content is required');
      return false;
    }
    if (!formData.category) {
      setError('Please select a category');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (promptErrors.length > 0) {
      setError(promptErrors.join('. '));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const promptData = {
        ...formData,
        placeholders: detectedPlaceholders,
      };
      await promptsApi.create(promptData);
      setSuccess(true);
      setTimeout(() => navigate('/prompts'), 1500);
    } catch (error) {
      setError('Failed to create prompt. Please try again.');
      console.error('Create failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeOptions = [
    '1-2 minutes',
    '3-5 minutes',
    '5-10 minutes',
    '10-15 minutes',
    '15-30 minutes',
    '30+ minutes',
  ];

  // Check if user is authenticated
  if (!user) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Create New Prompt
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          Please sign in to create new prompts.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create New Prompt
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Add a new prompt to your library for future use
      </Typography>

      <Paper elevation={2} sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Prompt created successfully! Redirecting...
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
          </Grid>
          
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth
              label="Prompt Title"
              value={formData.title}
              onChange={handleInputChange('title')}
              placeholder="e.g., Strategic Decision Framework"
              required
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={handleSelectChange('category')}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Brief description of what this prompt helps with..."
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Prompt Content
            </Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Prompt"
              value={formData.prompt}
              onChange={handleInputChange('prompt')}
              placeholder="Enter your prompt here... You can use placeholders like {context}, {goal}, etc."
              required
              helperText="Write your prompt with clear instructions. Use placeholders in curly braces for variables."
              error={promptErrors.length > 0}
            />
            {promptErrors.length > 0 && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {promptErrors.map((err, idx) => <div key={idx}>{err}</div>)}
              </Alert>
            )}
          </Grid>
          
          {detectedPlaceholders.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.700' }}>
                  🎯 Auto-detected Placeholders ({detectedPlaceholders.length})
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {detectedPlaceholders.map((placeholder, index) => (
                    <Chip
                      key={index}
                      label={`{${placeholder}}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  These placeholders will be available for customization when testing the prompt
                </Typography>
              </Box>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Metadata
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={formData.difficulty}
                onChange={handleSelectChange('difficulty')}
                label="Difficulty"
              >
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Estimated Time</InputLabel>
              <Select
                value={formData.estimatedTime}
                onChange={handleSelectChange('estimatedTime')}
                label="Estimated Time"
              >
                {timeOptions.map((time) => (
                  <MenuItem key={time} value={time}>
                    {time}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                label="Add Tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="e.g., strategy, analysis"
                size="small"
              />
              <Button variant="outlined" onClick={handleAddTag} disabled={!tagInput.trim()}>
                Add
              </Button>
            </Box>
          </Grid>

          {formData.tags.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box display="flex" gap={1} flexWrap="wrap">
                {formData.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          )}

          {/* Apps/Tools Section */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom>
              📱 Recommended Apps/Tools
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Suggest apps or tools that work well with this prompt
            </Typography>
            <Box display="flex" gap={1} sx={{ mb: 1 }}>
              <TextField
                fullWidth
                label="Add App/Tool"
                value={appInput}
                onChange={(e) => setAppInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddApp()}
                placeholder="e.g., ChatGPT, Claude, Notion"
                size="small"
              />
              <Button variant="outlined" onClick={handleAddApp} disabled={!appInput.trim()}>
                Add
              </Button>
            </Box>
          </Grid>

          {formData.apps.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box display="flex" gap={1} flexWrap="wrap">
                {formData.apps.map((app, index) => (
                  <Chip
                    key={index}
                    label={app}
                    onDelete={() => handleRemoveApp(app)}
                    size="small"
                    variant="filled"
                    color="secondary"
                  />
                ))}
              </Box>
            </Grid>
          )}

          {/* URLs/Resources Section */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom>
              🔗 Related Resources
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add helpful URLs or resources related to this prompt
            </Typography>
            <Box display="flex" gap={1} sx={{ mb: 1 }}>
              <TextField
                fullWidth
                label="Add URL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
                placeholder="https://example.com"
                size="small"
                type="url"
              />
              <Button variant="outlined" onClick={handleAddUrl} disabled={!urlInput.trim()}>
                Add
              </Button>
            </Box>
          </Grid>

          {formData.urls.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box display="flex" gap={1} flexWrap="wrap">
                {formData.urls.map((url, index) => (
                  <Chip
                    key={index}
                    label={url}
                    onDelete={() => handleRemoveUrl(url)}
                    size="small"
                    variant="outlined"
                    color="primary"
                    component="a"
                    href={url}
                    target="_blank"
                    clickable
                  />
                ))}
              </Box>
            </Grid>
          )}

          {/* Action Buttons */}
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={() => navigate('/prompts')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSubmit}
                disabled={loading || !formData.title.trim() || !formData.prompt.trim()}
              >
                {loading ? 'Creating...' : 'Create Prompt'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};