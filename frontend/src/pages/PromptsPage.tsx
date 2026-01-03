import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Rating,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as UsageIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { promptsApi, categoriesApi } from '../utils/api';
import { Prompt, Category } from '../types';

export const PromptsPage: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promptsResponse, categoriesResponse] = await Promise.all([
        promptsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setPrompts(Array.isArray(promptsResponse.data) ? promptsResponse.data : (promptsResponse as unknown) as Prompt[]);
      setCategories(Array.isArray(categoriesResponse.data) ? categoriesResponse.data : (categoriesResponse as unknown) as Category[]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
      };
      const response = await promptsApi.getAll(params);
      setPrompts(Array.isArray(response.data) ? response.data : (response as unknown) as Prompt[]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await promptsApi.delete(id);
        setPrompts(prompts.filter(p => p.id !== id));
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const sortedPrompts = [...prompts].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'rating':
        return b.rating - a.rating;
      case 'usageCount':
        return b.usageCount - a.usageCount;
      case 'createdAt':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (loading && prompts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Prompt Library
      </Typography>

      {/* Search and Filter Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={handleSearch} edge="end">
                    <SearchIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="createdAt">Newest First</MenuItem>
                <MenuItem value="title">Title A-Z</MenuItem>
                <MenuItem value="rating">Highest Rated</MenuItem>
                <MenuItem value="usageCount">Most Used</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/create')}
            >
              New Prompt
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Prompts Grid */}
      <Grid container spacing={3}>
        {sortedPrompts.map((prompt) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={prompt.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Typography variant="h6" component="h3" sx={{ flexGrow: 1, mr: 1 }}>
                    {prompt.title}
                  </Typography>
                  <Box display="flex" gap={0.5}>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small"
                        onClick={() => navigate(`/prompts/${prompt.id}`)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small"
                        onClick={() => handleDelete(prompt.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mb: 2, minHeight: 40 }}
                >
                  {prompt.description}
                </Typography>

                <Box display="flex" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  <Chip 
                    label={prompt.category} 
                    size="small" 
                    variant="outlined"
                  />
                  <Chip 
                    label={prompt.difficulty} 
                    size="small" 
                    color={getDifficultyColor(prompt.difficulty) as any}
                    variant="filled"
                  />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <StarIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {prompt.rating.toFixed(1)}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <UsageIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {prompt.usageCount} uses
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {prompt.estimatedTime}
                    </Typography>
                  </Box>
                </Box>

                {prompt.tags.length > 0 && (
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {prompt.tags.slice(0, 3).map((tag, index) => (
                      <Chip 
                        key={index}
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    ))}
                    {prompt.tags.length > 3 && (
                      <Chip 
                        label={`+${prompt.tags.length - 3}`}
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {prompts.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No prompts found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create your first prompt to get started!
          </Typography>
          <Button variant="contained" onClick={() => navigate('/create')}>
            Create New Prompt
          </Button>
        </Box>
      )}
    </Box>
  );
};