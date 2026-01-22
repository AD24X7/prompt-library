import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Rating,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  CompareArrows as CompareIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { promptsApi } from '../utils/api';
import { Prompt, Review } from '../types';

interface ToolStats {
  toolName: string;
  totalReviews: number;
  averageRating: number;
  promptsUsed: number;
  recentActivity: string;
  categories: string[];
  samplePrompts: { title: string; summary: string; rating: number }[];
  topPerformance: {
    category: string;
    rating: number;
    reviewCount: number;
  }[];
  worstPerformance: {
    category: string;
    rating: number;
    reviewCount: number;
  }[];
  strengths: string[];
  weaknesses: string[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tool-tabpanel-${index}`}
      aria-labelledby={`tool-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ToolPerformancePage: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [toolStats, setToolStats] = useState<ToolStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await promptsApi.getAll();
      const promptsData = (response.data || response) as unknown as Prompt[];
      setPrompts(promptsData);
      
      // Process data to extract tool statistics
      const stats = processToolStatistics(promptsData);
      setToolStats(stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processToolStatistics = (prompts: Prompt[]): ToolStats[] => {
    // Safety check for prompts array
    if (!prompts || !Array.isArray(prompts)) {
      return [];
    }

    const toolMap = new Map<string, {
      reviews: Review[];
      prompts: Prompt[];
      categories: Set<string>;
    }>();

    // Aggregate data by tool
    prompts.forEach(prompt => {
      // Safety check for prompt and its properties
      if (!prompt || !prompt.reviews || !Array.isArray(prompt.reviews)) {
        return;
      }

      prompt.reviews.forEach(review => {
        // Safety check for review and its properties
        if (!review || !review.toolUsed) {
          return;
        }

        const toolName = review.toolUsed;
        if (!toolMap.has(toolName)) {
          toolMap.set(toolName, {
            reviews: [],
            prompts: [],
            categories: new Set()
          });
        }
        
        const toolData = toolMap.get(toolName)!;
        toolData.reviews.push(review);
        if (!toolData.prompts.find(p => p.id === prompt.id)) {
          toolData.prompts.push(prompt);
          if (prompt.category) {
            toolData.categories.add(prompt.category);
          }
        }
      });
    });

    // Convert to ToolStats format
    return Array.from(toolMap.entries()).map(([toolName, data]) => {
      const reviews = data.reviews || [];
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length 
        : 0;

      // Calculate performance by category
      const categoryPerformance = new Map<string, { ratings: number[], count: number }>();
      
      data.prompts.forEach(prompt => {
        if (!prompt || !prompt.category) {
          return;
        }
        
        const categoryReviews = reviews.filter(r => 
          prompt.reviews?.some(pr => pr && pr.id === r.id)
        );
        
        if (categoryReviews.length > 0) {
          const categoryRating = categoryReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / categoryReviews.length;
          
          if (!categoryPerformance.has(prompt.category)) {
            categoryPerformance.set(prompt.category, { ratings: [], count: 0 });
          }
          
          const catData = categoryPerformance.get(prompt.category)!;
          catData.ratings.push(categoryRating);
          catData.count += categoryReviews.length;
        }
      });

      const categoryStats = Array.from(categoryPerformance.entries()).map(([category, data]) => ({
        category,
        rating: data.ratings.length > 0 ? data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length : 0,
        reviewCount: data.count
      }));

      const topPerformance = categoryStats
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3);

      const worstPerformance = categoryStats
        .sort((a, b) => a.rating - b.rating)
        .slice(0, 3);

      // Extract common strengths and weaknesses
      const strengthsSet = new Set(reviews
        .filter(r => r && r.whatWorked)
        .flatMap(r => r.whatWorked?.split(',').map(s => s.trim()).filter(s => s) || []));
      const strengths = Array.from(strengthsSet).slice(0, 5);

      const weaknessesSet = new Set(reviews
        .filter(r => r && r.whatDidntWork)
        .flatMap(r => r.whatDidntWork?.split(',').map(s => s.trim()).filter(s => s) || []));
      const weaknesses = Array.from(weaknessesSet).slice(0, 5);

      // Get sample prompts with highest ratings for this tool
      const samplePrompts = data.prompts
        .map(prompt => {
          const toolReviews = prompt.reviews?.filter(r => r.toolUsed === toolName) || [];
          const avgRating = toolReviews.length > 0 
            ? toolReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / toolReviews.length 
            : 0;
          return {
            title: prompt.title,
            summary: prompt.summary || `${prompt.title?.slice(0, 50)}...`,
            rating: avgRating
          };
        })
        .filter(p => p.rating > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3);

      return {
        toolName,
        totalReviews: reviews.length,
        averageRating,
        promptsUsed: data.prompts.length,
        recentActivity: reviews.length > 0 
          ? new Date(Math.max(...reviews.map(r => new Date(r.createdAt || Date.now()).getTime()))).toLocaleDateString()
          : 'No activity',
        categories: Array.from(data.categories),
        samplePrompts,
        topPerformance,
        worstPerformance,
        strengths,
        weaknesses
      };
    }).sort((a, b) => b.averageRating - a.averageRating);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'success';
    if (rating >= 3) return 'warning';
    return 'error';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4.5) return '🏆 Excellent';
    if (rating >= 4) return '✨ Very Good';
    if (rating >= 3) return '👍 Good';
    if (rating >= 2) return '⚠️ Fair';
    return '❌ Poor';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading tool performance data...</Typography>
      </Box>
    );
  }

  const categoriesSet = new Set(prompts.filter(p => p && p.category).map(p => p.category));
  const categories = ['all', ...Array.from(categoriesSet)];
  const filteredStats = selectedCategory === 'all' 
    ? toolStats 
    : toolStats.filter(stat => stat.categories.includes(selectedCategory));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          🎯 AI Tool Performance Analysis
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Compare AI tools based on real-world performance across different prompt categories
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Data-Driven Insights:</strong> This analysis is based on {toolStats.reduce((sum, tool) => sum + tool.totalReviews, 0)} reviews 
          across {toolStats.length} AI tools tested with {prompts.length} different prompts.
        </Alert>
      </Box>

      {/* Category Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="subtitle2" color="text.secondary">
            Filter by Category:
          </Typography>
          {categories.map(category => (
            <Chip
              key={category}
              label={category === 'all' ? 'All Categories' : category}
              onClick={() => setSelectedCategory(category)}
              color={selectedCategory === category ? 'primary' : 'default'}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="🏆 Tool Rankings" icon={<TrendingUpIcon />} />
          <Tab label="📊 Performance Matrix" icon={<AssessmentIcon />} />
          <Tab label="🔄 Tool Comparison" icon={<CompareIcon />} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* Tool Rankings */}
          <Grid container spacing={3}>
            {filteredStats.map((tool, index) => (
              <Grid key={tool.toolName} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ height: '100%', position: 'relative' }}>
                  {index < 3 && (
                    <Chip
                      label={`#${index + 1}`}
                      color="primary"
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}
                  
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {tool.toolName.charAt(0)}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" noWrap>
                          {tool.toolName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tool.totalReviews} reviews • {tool.promptsUsed} prompts
                        </Typography>
                      </Box>
                    </Box>

                    <Box mb={2}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Rating value={tool.averageRating} readOnly precision={0.1} size="small" />
                        <Typography variant="body2" color="text.secondary">
                          {tool.averageRating.toFixed(1)}
                        </Typography>
                      </Box>
                      <Chip
                        label={getRatingBadge(tool.averageRating)}
                        color={getRatingColor(tool.averageRating) as any}
                        size="small"
                        sx={{ mb: 2 }}
                      />
                    </Box>

                    <Typography variant="subtitle2" gutterBottom>
                      🎯 Best Performance:
                    </Typography>
                    {tool.topPerformance.slice(0, 2).map(perf => (
                      <Box key={perf.category} display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" noWrap>
                          {perf.category}
                        </Typography>
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          {perf.rating.toFixed(1)} ⭐
                        </Typography>
                      </Box>
                    ))}

                    {tool.strengths.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          💪 Key Strengths:
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {tool.strengths.slice(0, 3).map(strength => (
                            <Chip
                              key={strength}
                              label={strength}
                              size="small"
                              variant="outlined"
                              color="success"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Last activity: {tool.recentActivity}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Performance Matrix */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>AI Tool</strong></TableCell>
                  <TableCell><strong>Sample Prompt Uses</strong></TableCell>
                  <TableCell align="center"><strong>Overall Rating</strong></TableCell>
                  <TableCell align="center"><strong>Total Reviews</strong></TableCell>
                  <TableCell align="center"><strong>Prompts Tested</strong></TableCell>
                  <TableCell align="center"><strong>Categories</strong></TableCell>
                  <TableCell align="center"><strong>Performance</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStats.map((tool) => (
                  <TableRow key={tool.toolName} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {tool.toolName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {tool.toolName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tool.recentActivity}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 300 }}>
                        {tool.samplePrompts.length > 0 ? (
                          tool.samplePrompts.slice(0, 2).map((sample, index) => (
                            <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                ⭐ {sample.rating.toFixed(1)}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                                {sample.summary}
                              </Typography>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No reviewed prompts
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <Rating value={tool.averageRating} readOnly precision={0.1} size="small" />
                        <Typography variant="body2" color="text.secondary">
                          {tool.averageRating.toFixed(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="h6" color="primary.main">
                        {tool.totalReviews}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {tool.promptsUsed}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {tool.categories.length}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <LinearProgress
                        variant="determinate"
                        value={(tool.averageRating / 5) * 100}
                        color={getRatingColor(tool.averageRating) as any}
                        sx={{ width: '100px', mx: 'auto' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Tool Comparison */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Coming Soon:</strong> Side-by-side tool comparison with detailed metrics, 
            performance breakdowns by category, and recommended use cases.
          </Alert>

          <Grid container spacing={3}>
            {filteredStats.slice(0, 6).map((tool) => (
              <Grid key={tool.toolName} size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {tool.toolName}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="body2">Overall Score:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {tool.averageRating.toFixed(1)}/5.0
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2" gutterBottom>
                      Category Performance:
                    </Typography>
                    
                    {tool.topPerformance.slice(0, 3).map(perf => (
                      <Box key={perf.category} mb={1}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2">
                            {perf.category}
                          </Typography>
                          <Typography variant="body2">
                            {perf.rating.toFixed(1)} ({perf.reviewCount} reviews)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(perf.rating / 5) * 100}
                          color={getRatingColor(perf.rating) as any}
                          sx={{ height: 6, borderRadius: 1 }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          🚀 Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Button
              variant="contained"
              startIcon={<StarIcon />}
              fullWidth
              onClick={() => window.location.href = '/prompts'}
            >
              Add New Review
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Button
              variant="outlined"
              startIcon={<AssessmentIcon />}
              fullWidth
            >
              Export Performance Report
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Button
              variant="outlined"
              startIcon={<CompareIcon />}
              fullWidth
            >
              Compare Specific Tools
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};