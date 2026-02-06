import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Category as CategoryIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { categoriesApi, promptsApi } from '../utils/api';
import { Category, Prompt } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const CategoriesPage: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesResponse, promptsResponse] = await Promise.all([
        categoriesApi.getAll(),
        promptsApi.getAll(),
      ]);
      setCategories(Array.isArray(categoriesResponse.data) ? categoriesResponse.data : (categoriesResponse as unknown) as Category[]);
      setPrompts(Array.isArray(promptsResponse.data) ? promptsResponse.data : (promptsResponse as unknown) as Prompt[]);
    } catch (error) {
      setError('Failed to fetch data');
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryPromptCount = (categoryName: string) => {
    return prompts.filter(prompt => prompt.category === categoryName).length;
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      const response = await categoriesApi.create(newCategory);
      const createdCategory = response.data || response;
      setCategories(prev => [...prev, (createdCategory as unknown) as Category]);
      setCreateDialogOpen(false);
      setNewCategory({ name: '', description: '' });
      setError('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Failed to create category');
      console.error('Failed to create category:', error);
    }
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      await categoriesApi.delete(categoryToDelete.id);
      setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      setError('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Failed to delete category');
      console.error('Failed to delete category:', error);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Categories
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Organize your prompts by categories for better management
          </Typography>
        </Box>
        {user && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Category
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Category created successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {categories.map((category) => {
          const promptCount = getCategoryPromptCount(category.name);
          return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={category.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center">
                      <CategoryIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="h3">
                        {category.name}
                      </Typography>
                    </Box>
                    {user && user.email === 'anvitaiitb@gmail.com' && (
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(category)}
                        color="error"
                        sx={{ 
                          opacity: 0.7,
                          '&:hover': { opacity: 1 }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ mb: 2, minHeight: 40 }}
                  >
                    {category.description || 'No description provided'}
                  </Typography>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Chip 
                      label={`${promptCount} ${promptCount === 1 ? 'prompt' : 'prompts'}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Created {new Date(category.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {categories.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Box textAlign="center" py={8}>
              <CategoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No categories yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user ? 'Create your first category to organize your prompts!' : 'Sign in to create and manage categories'}
              </Typography>
              {user && (
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Category
                </Button>
              )}
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Create Category Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            variant="outlined"
            value={newCategory.name}
            onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newCategory.description}
            onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of what prompts this category contains..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateCategory}
            variant="contained"
            disabled={!newCategory.name.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Delete Category
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete the category "{categoryToDelete?.name}"?
          </Typography>
          {categoryToDelete && getCategoryPromptCount(categoryToDelete.name) > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This category contains {getCategoryPromptCount(categoryToDelete.name)} prompt(s). 
              Deleting this category will not delete the prompts, but they will no longer be associated with this category.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};