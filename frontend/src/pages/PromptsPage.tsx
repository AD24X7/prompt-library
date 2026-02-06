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
  Tooltip,
  CircularProgress,
  Paper,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as UsageIcon,
  Analytics as AnalyticsIcon,
  GridView as GridViewIcon,
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
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [viewMode, setViewMode] = useState<'cards' | 'analytics'>('cards');
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

  // Extract all unique tags from prompts, grouped by type for better UX
  const getTagsByType = () => {
    const allTags = new Set<string>();
    prompts.forEach(prompt => {
      if (prompt.tags) {
        prompt.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    const tagsByType = {
      'Usage Pattern': ['one-off', 'repetitive'],
      'Cognitive Type': ['mechanical', 'reasoning', 'mech+reason'],
      'Interaction Style': ['ui-heavy', 'skills-heavy'],
      'Turn Complexity': ['single-turn', 'multi-turn', 'extended'],
      'Domain Category': ['strategy', 'analysis', 'creative', 'technical', 'communication', 'education', 'management', 'marketing', 'personal']
    };
    
    // Filter to only show tags that actually exist in the data
    const availableTagsByType: {[key: string]: string[]} = {};
    Object.entries(tagsByType).forEach(([type, tags]) => {
      const availableTags = tags.filter(tag => allTags.has(tag));
      if (availableTags.length > 0) {
        availableTagsByType[type] = availableTags;
      }
    });
    
    return availableTagsByType;
  };

  const getAllTags = () => {
    const allTags = new Set<string>();
    prompts.forEach(prompt => {
      if (prompt.tags) {
        prompt.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };

  const getDepartments = () => {
    const departments = new Set<string>();
    prompts.forEach(prompt => {
      if (prompt.reviews) {
        prompt.reviews.forEach(review => {
          if (review.department) {
            departments.add(review.department);
          }
        });
      }
    });
    // Add sample departments if none exist
    if (departments.size === 0) {
      return ['Product', 'Engineering', 'Marketing', 'Sales', 'Support', 'Operations'];
    }
    return Array.from(departments);
  };

  const getTestedTools = (prompt: Prompt) => {
    if (!prompt.reviews || prompt.reviews.length === 0) return [];
    return Array.from(new Set(prompt.reviews.map(r => r.toolUsed)));
  };

  // Apply filters to prompts
  const filteredPrompts = prompts.filter(prompt => {
    if (selectedCategory && prompt.category !== selectedCategory) return false;
    if (selectedTag && !prompt.tags.includes(selectedTag)) return false;
    if (selectedDepartment && (!prompt.reviews || !prompt.reviews.some(r => r.department === selectedDepartment))) return false;
    if (searchTerm && !prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !prompt.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // PM Analytics Data
  const getScenarioAnalytics = () => {
    const categoryStats: {[key: string]: {count: number, reviewed: number, avgRating: number}} = {};
    const complexityStats = { simple: 0, moderate: 0, complex: 0 };
    const interactionStats = { 'ui-heavy': 0, 'skills-heavy': 0, mixed: 0 };
    const usageStats = { 'one-off': 0, 'repetitive': 0 };
    
    filteredPrompts.forEach(prompt => {
      // Category stats
      const category = prompt.category;
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, reviewed: 0, avgRating: 0 };
      }
      categoryStats[category].count++;
      if (prompt.reviews && prompt.reviews.length > 0) {
        categoryStats[category].reviewed++;
        categoryStats[category].avgRating = prompt.rating;
      }
      
      // Complexity based on tags
      if (prompt.tags.includes('single-turn')) complexityStats.simple++;
      else if (prompt.tags.includes('multi-turn')) complexityStats.moderate++;
      else if (prompt.tags.includes('extended')) complexityStats.complex++;
      
      // Interaction style
      if (prompt.tags.includes('ui-heavy')) interactionStats['ui-heavy']++;
      else if (prompt.tags.includes('skills-heavy')) interactionStats['skills-heavy']++;
      else interactionStats.mixed++;
      
      // Usage pattern
      if (prompt.tags.includes('one-off')) usageStats['one-off']++;
      else if (prompt.tags.includes('repetitive')) usageStats['repetitive']++;
    });
    
    return { categoryStats, complexityStats, interactionStats, usageStats };
  };

  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'rating':
        return b.rating - a.rating;
      case 'usageCount':
        return b.usageCount - a.usageCount;
      case 'reviewCount':
        return (b.reviews?.length || 0) - (a.reviews?.length || 0);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h4">
          🧪 Test Cases & Prompts
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="cards">
              <GridViewIcon sx={{ mr: 1 }} />
              Cards
            </ToggleButton>
            <ToggleButton value="analytics">
              <AnalyticsIcon sx={{ mr: 1 }} />
              PM Analytics
            </ToggleButton>
          </ToggleButtonGroup>
          
          {(selectedCategory || selectedTag || selectedDepartment || searchTerm) && (
            <Typography variant="body2" color="text.secondary">
              Showing {filteredPrompts.length} of {prompts.length} test cases
            </Typography>
          )}
          <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
            {selectedCategory || selectedTag || selectedDepartment || searchTerm ? 
              `${filteredPrompts.length}` : `${prompts.length}`} Test Cases
          </Typography>
        </Box>
      </Box>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
        Browse and manage prompts used for AI tool performance testing
      </Typography>

      {/* Search and Filter Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                endAdornment: (
                  <IconButton edge="end">
                    <SearchIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
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
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Tag</InputLabel>
              <Select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                label="Tag"
              >
                <MenuItem value="">All Tags</MenuItem>
                {Object.entries(getTagsByType()).map(([type, tags]) => [
                  <MenuItem key={type} disabled sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {type}
                  </MenuItem>,
                  ...tags.map((tag) => (
                    <MenuItem key={tag} value={tag} sx={{ pl: 3 }}>
                      {tag}
                    </MenuItem>
                  ))
                ])}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                label="Department"
              >
                <MenuItem value="">All Departments</MenuItem>
                {getDepartments().map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
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
                <MenuItem value="reviewCount">Most Reviewed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/create')}
            >
              ➕ Add
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <Box sx={{ mb: 2 }}>
          {(() => {
            const analytics = getScenarioAnalytics();
            return (
              <Grid container spacing={2}>
                {/* Scenario Types Overview */}
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      📊 Scenario Types Distribution
                    </Typography>
                    <Grid container spacing={1.5}>
                      {Object.entries(analytics.categoryStats)
                        .sort(([,a], [,b]) => b.count - a.count)
                        .map(([category, stats]) => (
                        <Grid size={{ xs: 12, md: 6, lg: 3 }} key={category}>
                          <Card 
                            sx={{ 
                              height: '100%', 
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                            }}
                            onClick={() => {
                              setSelectedCategory(category);
                              setViewMode('cards');
                            }}
                          >
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Typography variant="subtitle2" gutterBottom>
                                {category}
                              </Typography>
                              <Typography variant="h4" color="primary" sx={{ mb: 1 }}>
                                {stats.count}
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={(stats.count / filteredPrompts.length) * 100}
                                sx={{ mb: 1, height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {((stats.count / filteredPrompts.length) * 100).toFixed(1)}% of test cases
                              </Typography>
                              {stats.reviewed > 0 && (
                                <Typography variant="body2" color="success.main" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                                  ✓ {stats.reviewed} tested • ⭐ {stats.avgRating.toFixed(1)}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Complexity Analysis */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1rem' }}>
                      🎯 Complexity Distribution
                    </Typography>
                    {[
                      { label: 'Simple (Single-turn)', value: analytics.complexityStats.simple, color: 'success.main', tag: 'single-turn' },
                      { label: 'Moderate (Multi-turn)', value: analytics.complexityStats.moderate, color: 'warning.main', tag: 'multi-turn' },
                      { label: 'Complex (Extended)', value: analytics.complexityStats.complex, color: 'error.main', tag: 'extended' }
                    ].map(item => (
                      <Box 
                        key={item.label} 
                        sx={{ 
                          mb: 1.5, 
                          cursor: item.value > 0 ? 'pointer' : 'default',
                          opacity: item.value > 0 ? 1 : 0.5,
                          p: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s',
                          '&:hover': item.value > 0 ? { backgroundColor: 'action.hover', transform: 'scale(1.02)' } : {}
                        }}
                        onClick={() => {
                          if (item.value > 0) {
                            setSelectedTag(item.tag);
                            setViewMode('cards');
                          }
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{item.label}</Typography>
                          <Typography variant="body2" fontWeight="bold">{item.value}</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={filteredPrompts.length > 0 ? (item.value / filteredPrompts.length) * 100 : 0}
                          sx={{ height: 4, borderRadius: 2, [`& .MuiLinearProgress-bar`]: { backgroundColor: item.color } }}
                        />
                      </Box>
                    ))}
                  </Paper>
                </Grid>

                {/* Interaction Style */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1rem' }}>
                      💻 Interaction Style
                    </Typography>
                    {[
                      { label: 'UI-Heavy', value: analytics.interactionStats['ui-heavy'], color: 'primary.main', tag: 'ui-heavy' },
                      { label: 'Skills-Heavy', value: analytics.interactionStats['skills-heavy'], color: 'secondary.main', tag: 'skills-heavy' },
                      { label: 'Mixed/Other', value: analytics.interactionStats.mixed, color: 'grey.500', tag: null }
                    ].map(item => (
                      <Box 
                        key={item.label} 
                        sx={{ 
                          mb: 1.5, 
                          cursor: (item.value > 0 && item.tag) ? 'pointer' : 'default',
                          opacity: item.value > 0 ? 1 : 0.5,
                          p: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s',
                          '&:hover': (item.value > 0 && item.tag) ? { backgroundColor: 'action.hover', transform: 'scale(1.02)' } : {}
                        }}
                        onClick={() => {
                          if (item.value > 0 && item.tag) {
                            setSelectedTag(item.tag);
                            setViewMode('cards');
                          }
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{item.label}</Typography>
                          <Typography variant="body2" fontWeight="bold">{item.value}</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={filteredPrompts.length > 0 ? (item.value / filteredPrompts.length) * 100 : 0}
                          sx={{ height: 4, borderRadius: 2, [`& .MuiLinearProgress-bar`]: { backgroundColor: item.color } }}
                        />
                      </Box>
                    ))}
                  </Paper>
                </Grid>

                {/* Usage Pattern */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1rem' }}>
                      🔄 Usage Pattern
                    </Typography>
                    {[
                      { label: 'One-off Tasks', value: analytics.usageStats['one-off'], color: 'info.main', tag: 'one-off' },
                      { label: 'Repetitive Tasks', value: analytics.usageStats['repetitive'], color: 'success.main', tag: 'repetitive' }
                    ].map(item => (
                      <Box 
                        key={item.label} 
                        sx={{ 
                          mb: 1.5, 
                          cursor: item.value > 0 ? 'pointer' : 'default',
                          opacity: item.value > 0 ? 1 : 0.5,
                          p: 1,
                          borderRadius: 1,
                          transition: 'all 0.2s',
                          '&:hover': item.value > 0 ? { backgroundColor: 'action.hover', transform: 'scale(1.02)' } : {}
                        }}
                        onClick={() => {
                          if (item.value > 0) {
                            setSelectedTag(item.tag);
                            setViewMode('cards');
                          }
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{item.label}</Typography>
                          <Typography variant="body2" fontWeight="bold">{item.value}</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={filteredPrompts.length > 0 ? (item.value / filteredPrompts.length) * 100 : 0}
                          sx={{ height: 4, borderRadius: 2, [`& .MuiLinearProgress-bar`]: { backgroundColor: item.color } }}
                        />
                      </Box>
                    ))}
                  </Paper>
                </Grid>

                {/* Key Insights */}
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1rem' }}>
                      💡 Key Insights for PM Planning
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          📈 Top Scenario Types
                        </Typography>
                        {Object.entries(analytics.categoryStats)
                          .sort(([,a], [,b]) => b.count - a.count)
                          .slice(0, 3)
                          .map(([category, stats], index) => (
                            <Chip 
                              key={category}
                              label={`${category} (${stats.count})`}
                              color={index === 0 ? "primary" : "default"}
                              variant={index === 0 ? "filled" : "outlined"}
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))
                        }
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="secondary" gutterBottom>
                          🎯 Testing Coverage Opportunities
                        </Typography>
                        {Object.entries(analytics.categoryStats)
                          .filter(([,stats]) => stats.reviewed === 0)
                          .slice(0, 3)
                          .map(([category]) => (
                            <Chip 
                              key={category}
                              label={`${category} (untested)`}
                              color="warning"
                              variant="outlined"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))
                        }
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            );
          })()}
        </Box>
      )}

      {/* Prompts Grid */}
      {viewMode === 'cards' && (
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
                  {getTestedTools(prompt).length > 0 && (
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {getTestedTools(prompt).slice(0, 2).map((tool) => (
                        <Chip 
                          key={tool}
                          label={tool} 
                          size="small" 
                          color="primary"
                          variant="filled"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                      {getTestedTools(prompt).length > 2 && (
                        <Chip 
                          label={`+${getTestedTools(prompt).length - 2} more`}
                          size="small" 
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                    </Box>
                  )}
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
                      {prompt.reviews?.length || 0} reviews
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
      )}

      {filteredPrompts.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {prompts.length === 0 ? 'No prompts found' : 'No prompts match your filters'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {prompts.length === 0 ? 'Create your first prompt to get started!' : 'Try adjusting your search criteria or filters'}
          </Typography>
          {prompts.length === 0 ? (
            <Button variant="contained" onClick={() => navigate('/create')}>
              Create New Prompt
            </Button>
          ) : (
            <Button variant="outlined" onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
              setSelectedTag('');
              setSelectedDepartment('');
            }}>
              Clear All Filters
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};