import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  MenuBook as LibraryIcon,
  Category as CategoryIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../utils/api';
import { Stats } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await statsApi.get();
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome to Your Prompt Library
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Manage and organize your LLM prompts for strategic leadership and product management
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <LibraryIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Prompts
                  </Typography>
                  <Typography variant="h5">
                    {stats?.totalPrompts || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CategoryIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Categories
                  </Typography>
                  <Typography variant="h5">
                    {stats?.totalCategories || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUpIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Usage
                  </Typography>
                  <Typography variant="h5">
                    {stats?.totalUsage || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <StarIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Avg Rating
                  </Typography>
                  <Typography variant="h5">
                    {stats?.averageRating?.toFixed(1) || '0.0'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Categories */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Categories
              </Typography>
              <List dense>
                {stats?.topCategories?.map((category, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Chip 
                        label={category.count} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    </ListItemIcon>
                    <ListItemText primary={category.name} />
                  </ListItem>
                )) || (
                  <Typography color="text.secondary">No categories yet</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Prompts */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Recent Prompts
                </Typography>
                <Button size="small" onClick={() => navigate('/prompts')}>
                  View All
                </Button>
              </Box>
              <List dense>
                {stats?.recentPrompts?.slice(0, 5).map((prompt) => (
                  <ListItem key={prompt.id} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/prompts/${prompt.id}`)}>
                    <ListItemIcon>
                      <AccessTimeIcon color="action" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={prompt.title}
                      secondary={`${prompt.category} • ${prompt.difficulty}`}
                    />
                  </ListItem>
                )) || (
                  <Typography color="text.secondary">No prompts yet</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button 
                  variant="contained" 
                  onClick={() => navigate('/create')}
                  startIcon={<LibraryIcon />}
                >
                  Create New Prompt
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/prompts')}
                  startIcon={<TrendingUpIcon />}
                >
                  Browse Prompts
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/categories')}
                  startIcon={<CategoryIcon />}
                >
                  Manage Categories
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};