import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Tag as TagIcon,
  Visibility as ViewIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { promptsApi } from '../utils/api';
import { Prompt } from '../types';
import { useNavigate } from 'react-router-dom';

interface TagGroup {
  tag: string;
  prompts: Prompt[];
  totalReviews: number;
  averageRating: number;
  popularTools: { tool: string; count: number }[];
  categories: string[];
}

export const TagsPage: React.FC = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await promptsApi.getAll();
      const promptsData = (response.data?.data || response.data || response) as unknown as Prompt[];
      setPrompts(promptsData);
      
      // Process data to create tag groups
      const groups = processTagGroups(promptsData);
      setTagGroups(groups);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTagGroups = (prompts: Prompt[]): TagGroup[] => {
    const tagMap = new Map<string, Prompt[]>();
    
    // Group prompts by tags
    prompts.forEach(prompt => {
      if (prompt.tags && prompt.tags.length > 0) {
        prompt.tags.forEach(tag => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, []);
          }
          tagMap.get(tag)!.push(prompt);
        });
      } else {
        // Handle prompts without tags
        if (!tagMap.has('untagged')) {
          tagMap.set('untagged', []);
        }
        tagMap.get('untagged')!.push(prompt);
      }
    });

    // Convert to TagGroup format
    return Array.from(tagMap.entries()).map(([tag, tagPrompts]) => {
      const allReviews = tagPrompts.flatMap(p => p.reviews || []);
      
      // Calculate tool usage
      const toolCounts = new Map<string, number>();
      allReviews.forEach(review => {
        const tool = review.toolUsed || 'Unknown';
        toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
      });
      
      const popularTools = Array.from(toolCounts.entries())
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get unique categories
      const categories = Array.from(new Set(tagPrompts.map(p => p.category).filter(Boolean)));

      const averageRating = allReviews.length > 0 
        ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length 
        : 0;

      return {
        tag,
        prompts: tagPrompts,
        totalReviews: allReviews.length,
        averageRating,
        popularTools,
        categories
      };
    }).sort((a, b) => b.totalReviews - a.totalReviews);
  };

  const filteredTagGroups = tagGroups.filter(group =>
    searchTerm === '' || 
    group.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.prompts.some(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedTagData = selectedTag === 'all' 
    ? null 
    : tagGroups.find(group => group.tag === selectedTag);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading tags and prompts...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          🏷️ Browse by Tags
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Discover prompts and reviews organized by topics and themes
        </Typography>
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search tags or prompts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Tag Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {filteredTagGroups.slice(0, 12).map((group) => (
          <Grid key={group.tag} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => setSelectedTag(group.tag)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <TagIcon />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6" noWrap>
                      {group.tag === 'untagged' ? '🔖 Untagged' : `#${group.tag}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {group.prompts.length} prompts • {group.totalReviews} reviews
                    </Typography>
                  </Box>
                </Box>

                {group.averageRating > 0 && (
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Rating value={group.averageRating} readOnly precision={0.1} size="small" />
                    <Typography variant="body2" color="text.secondary">
                      {group.averageRating.toFixed(1)}
                    </Typography>
                  </Box>
                )}

                <Typography variant="subtitle2" gutterBottom>
                  🔧 Popular Tools:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                  {group.popularTools.slice(0, 3).map(tool => (
                    <Chip
                      key={tool.tool}
                      label={`${tool.tool} (${tool.count})`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  📂 Categories:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {group.categories.slice(0, 2).map(category => (
                    <Chip
                      key={category}
                      label={category}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Selected Tag Detail */}
      {selectedTagData && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">
              🏷️ {selectedTagData.tag === 'untagged' ? 'Untagged Prompts' : `#${selectedTagData.tag}`}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => setSelectedTag('all')}
            >
              Back to All Tags
            </Button>
          </Box>

          {/* Tag Statistics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {selectedTagData.prompts.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prompts
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="secondary.main">
                  {selectedTagData.totalReviews}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reviews
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {selectedTagData.averageRating.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Rating
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {selectedTagData.categories.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Categories
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Prompts in this tag */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            📋 Prompts with this tag:
          </Typography>
          
          {selectedTagData.prompts.map((prompt) => (
            <Accordion key={prompt.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  <Typography variant="subtitle1" flex={1}>
                    {prompt.title}
                  </Typography>
                  <Badge badgeContent={prompt.reviews.length} color="primary">
                    <StarIcon />
                  </Badge>
                  <Chip label={prompt.category} size="small" />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {prompt.description}
                </Typography>
                
                {prompt.reviews.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      🔧 Tool Reviews:
                    </Typography>
                    <Grid container spacing={1}>
                      {prompt.reviews.map((review) => (
                        <Grid key={review.id} size={{ xs: 12, sm: 6, md: 4 }}>
                          <Paper sx={{ p: 2 }} variant="outlined">
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" fontWeight="bold">
                                {review.toolUsed}
                              </Typography>
                              <Rating value={review.rating} readOnly size="small" />
                            </Box>
                            {review.comment && (
                              <Typography variant="caption" color="text.secondary">
                                {review.comment.length > 100 
                                  ? `${review.comment.substring(0, 100)}...` 
                                  : review.comment}
                              </Typography>
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`/prompts/${prompt.id}`)}
                  >
                    View Full Details
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      )}

      {/* Quick Stats */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          📊 Tag Statistics
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main">
                {tagGroups.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Tags
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box textAlign="center">
              <Typography variant="h4" color="secondary.main">
                {prompts.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Prompts
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {prompts.reduce((sum, p) => sum + p.reviews.length, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Reviews
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};