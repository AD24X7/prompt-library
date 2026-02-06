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
  prompts: Prompt[]; // Add prompts array for tag filtering
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
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [filterBy, setFilterBy] = useState<'category' | 'tag'>('category');
  const [selectedTagType, setSelectedTagType] = useState<string>('all');

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
        prompts: data.prompts,
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
  
  // Tag type definitions
  const TAG_TYPES: Record<string, string> = {
    'all': 'All Types',
    'usage-pattern': 'Usage Pattern',
    'cognitive-type': 'Cognitive Type', 
    'interaction-style': 'Interaction Style',
    'turn-complexity': 'Turn Complexity',
    'domain-category': 'Domain Category'
  };

  const TAG_VALUES: Record<string, string[]> = {
    'usage-pattern': ['one-off', 'repetitive'],
    'cognitive-type': ['mechanical', 'reasoning', 'mech+reason'],
    'interaction-style': ['ui-heavy', 'skills-heavy'],
    'turn-complexity': ['single-turn', 'multi-turn', 'extended'],
    'domain-category': ['strategy', 'analysis', 'creative', 'technical', 'communication', 'education', 'management', 'marketing', 'personal']
  };

  // Get available tags based on selected tag type
  const getAvailableTags = () => {
    if (selectedTagType === 'all') {
      // Don't show individual tags when 'all' tag type is selected - too messy
      return ['all'];
    } else {
      return ['all', ...(TAG_VALUES[selectedTagType] || [])];
    }
  };

  const tags = getAvailableTags();

  // Helper function to get tags of a specific type from a prompt
  const getTagsOfType = (prompt: Prompt, tagType: string) => {
    if (!prompt.tags || !Array.isArray(prompt.tags)) return [];
    if (tagType === 'all') return prompt.tags;
    return prompt.tags.filter(tag => TAG_VALUES[tagType]?.includes(tag) || false);
  };

  // Helper function to get all tag types for a tool's prompts
  const getToolTagSummary = (toolStat: ToolStats) => {
    if (!toolStat.prompts) return {};
    
    const tagSummary: Record<string, Set<string>> = {};
    
    Object.keys(TAG_VALUES).forEach(tagType => {
      tagSummary[tagType] = new Set();
      toolStat.prompts.forEach(prompt => {
        const tagsOfType = getTagsOfType(prompt, tagType);
        tagsOfType.forEach(tag => tagSummary[tagType].add(tag));
      });
    });
    
    // Convert Sets to Arrays
    const result: Record<string, string[]> = {};
    Object.entries(tagSummary).forEach(([type, tagSet]) => {
      result[type] = Array.from(tagSet);
    });
    
    return result;
  };
  
  const filteredStats = (() => {
    if (filterBy === 'category') {
      return selectedCategory === 'all' 
        ? toolStats 
        : toolStats.filter(stat => stat.categories.includes(selectedCategory));
    } else {
      if (selectedTag === 'all') return toolStats;
      
      // Filter tools that have reviews on prompts with the selected tag
      return toolStats.filter(stat => 
        stat.prompts && Array.isArray(stat.prompts) && stat.prompts.some(prompt => 
          prompt && prompt.tags && Array.isArray(prompt.tags) && prompt.tags.includes(selectedTag)
        )
      );
    }
  })();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          🎯 AI Tool Performance Analysis
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Compare AI tools based on real-world performance across different departments and task types
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Data-Driven Insights:</strong> This analysis is based on {toolStats.reduce((sum, tool) => sum + tool.totalReviews, 0)} reviews 
          across {toolStats.length} AI tools tested with {prompts.length} different prompts.
        </Alert>
      </Box>

      {/* Filter Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Filter by:
          </Typography>
          <Button
            variant={filterBy === 'category' ? 'contained' : 'outlined'}
            onClick={() => {
              setFilterBy('category');
              setSelectedCategory('all');
            }}
            size="small"
          >
            Department
          </Button>
          <Button
            variant={filterBy === 'tag' ? 'contained' : 'outlined'}
            onClick={() => {
              setFilterBy('tag');
              setSelectedTagType('all');
              setSelectedTag('all');
            }}
            size="small"
          >
            Tag Type
          </Button>
        </Box>
        
        {filterBy === 'category' ? (
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              Departments:
            </Typography>
            {categories.map(category => (
              <Chip
                key={category}
                label={category === 'all' ? 'All Departments' : category}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>
        ) : (
          <Box>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={2}>
              <Typography variant="body2" color="text.secondary">
                Tag Type:
              </Typography>
              {Object.entries(TAG_TYPES).map(([typeKey, typeLabel]) => (
                <Chip
                  key={typeKey}
                  label={typeLabel}
                  onClick={() => {
                    setSelectedTagType(typeKey);
                    setSelectedTag('all');
                  }}
                  color={selectedTagType === typeKey ? 'secondary' : 'default'}
                  variant={selectedTagType === typeKey ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                {selectedTagType === 'all' ? 'Select a tag type above to see available tags' : `${TAG_TYPES[selectedTagType]}:`}
              </Typography>
              {selectedTagType !== 'all' && tags.map(tag => (
                <Chip
                  key={tag}
                  label={tag === 'all' ? 'All' : tag}
                  onClick={() => setSelectedTag(tag)}
                  color={selectedTag === tag ? 'primary' : 'default'}
                  variant={selectedTag === tag ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="🏆 Tool Rankings" icon={<TrendingUpIcon />} />
          <Tab label="📊 Performance by Tag Type" icon={<AssessmentIcon />} />
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


                    {/* Key Insights Summary */}
                    <Box mt={2}>
                      {tool.strengths.length > 0 && (
                        <Box mb={1}>
                          <Typography variant="body2" color="success.main" sx={{ fontSize: '0.85rem', lineHeight: 1.3 }}>
                            <strong>💪 Strengths:</strong> {(() => {
                              // Intelligent summarization of strengths
                              const topStrengths = tool.strengths.slice(0, 3);
                              if (topStrengths.length <= 2) return topStrengths.join(' and ');
                              return topStrengths.slice(0, 2).join(', ') + ', and ' + topStrengths[2];
                            })()}
                          </Typography>
                        </Box>
                      )}
                      {tool.weaknesses.length > 0 && (
                        <Box>
                          <Typography variant="body2" color="error.main" sx={{ fontSize: '0.85rem', lineHeight: 1.3 }}>
                            <strong>⚠️ Areas for improvement:</strong> {(() => {
                              // Intelligent summarization of weaknesses
                              const topWeaknesses = tool.weaknesses.slice(0, 3);
                              if (topWeaknesses.length <= 2) return topWeaknesses.join(' and ');
                              return topWeaknesses.slice(0, 2).join(', ') + ', and ' + topWeaknesses[2];
                            })()}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Tag Summary */}
                    {(() => {
                      const tagSummary = getToolTagSummary(tool);
                      const hasRelevantTags = filterBy === 'tag' && selectedTagType !== 'all' && 
                                            tagSummary[selectedTagType] && tagSummary[selectedTagType].length > 0;
                      
                      if (hasRelevantTags) {
                        return (
                          <Box mt={2}>
                            <Typography variant="subtitle2" gutterBottom>
                              🏷️ {TAG_TYPES[selectedTagType]}:
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                              {tagSummary[selectedTagType].map(tag => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                />
                              ))}
                            </Box>
                          </Box>
                        );
                      }
                      return null;
                    })()}

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
          {/* Performance by Tag Type */}
          <Box mb={1}>
            <Typography variant="h5" gutterBottom sx={{ mb: 0.5 }}>
              🏷️ Performance Analysis by Tag Type
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              See how each AI tool performs across different task characteristics and prompt types.
            </Typography>
          </Box>

          <Grid container spacing={1}>
            {Object.entries(TAG_TYPES).filter(([key]) => key !== 'all').map(([tagType, tagLabel]) => (
              <Grid key={tagType} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                      {tagLabel}
                    </Typography>
                    
                    {filteredStats.map(tool => {
                      const tagSummary = getToolTagSummary(tool);
                      const tagValues = tagSummary[tagType] || [];
                      
                      if (tagValues.length === 0) return null;
                      
                      // Calculate performance for each tag value
                      const tagPerformance = tagValues.map(tagValue => {
                        const relevantPrompts = tool.prompts.filter(prompt => 
                          prompt.tags && prompt.tags.includes(tagValue)
                        );
                        
                        const reviews = relevantPrompts.flatMap(prompt => 
                          prompt.reviews?.filter(review => review.toolUsed === tool.toolName) || []
                        );
                        
                        const avgRating = reviews.length > 0 
                          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length 
                          : 0;
                          
                        const promptCount = relevantPrompts.length;
                        
                        // Get all prompts for this tag
                        const allPrompts = relevantPrompts.map(p => p.prompt || p.title || 'No prompt available');
                        
                        return {
                          tagValue,
                          rating: avgRating,
                          promptCount,
                          reviewCount: reviews.length,
                          allPrompts: allPrompts
                        };
                      }).filter(perf => perf.reviewCount > 0);
                      
                      if (tagPerformance.length === 0) return null;
                      
                      return (
                        <Box key={tool.toolName} mb={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24, fontSize: '0.8rem' }}>
                                {tool.toolName.charAt(0)}
                              </Avatar>
                              <Typography variant="body2" fontWeight="bold">
                                {tool.toolName}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {tagPerformance.map((perf, index) => {
                            // Get weaknesses for this specific tag
                            const relevantPrompts = tool.prompts.filter(prompt => 
                              prompt.tags && prompt.tags.includes(perf.tagValue)
                            );
                            const reviews = relevantPrompts.flatMap(prompt => 
                              prompt.reviews?.filter(review => review.toolUsed === tool.toolName) || []
                            );
                            
                            const weaknesses = Array.from(new Set(reviews
                              .filter(r => r.whatDidntWork)
                              .flatMap(r => r.whatDidntWork?.split(',').map(s => s.trim()).filter(s => s) || [])
                            )).slice(0, 3);

                            return (
                              <Box key={perf.tagValue} mb={1}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                  <Chip 
                                    label={perf.tagValue} 
                                    size="small" 
                                    color="info" 
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem', height: '20px' }}
                                  />
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <Rating value={perf.rating} readOnly precision={0.1} size="small" sx={{ fontSize: '1rem' }} />
                                    <Typography variant="body2" fontWeight="bold" fontSize="0.85rem">
                                      {perf.rating.toFixed(1)}
                                    </Typography>
                                  </Box>
                                </Box>
                                
                                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                  {perf.promptCount} prompts • {perf.reviewCount} reviews
                                </Typography>
                                
                                <LinearProgress
                                  variant="determinate"
                                  value={(perf.rating / 5) * 100}
                                  color={getRatingColor(perf.rating) as any}
                                  sx={{ mb: 0.5, height: 3, borderRadius: 1 }}
                                />
                                
                                {/* Expandable Prompt Details */}
                                <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, overflow: 'hidden' }}>
                                  <Box 
                                    sx={{ 
                                      p: 0.5, 
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: 'grey.100' }
                                    }}
                                    onClick={() => {
                                      const element = document.getElementById(`prompt-details-${tool.toolName}-${perf.tagValue}-${index}`);
                                      if (element) {
                                        element.style.display = element.style.display === 'none' ? 'block' : 'none';
                                      }
                                    }}
                                  >
                                    <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.65rem' }}>
                                      📝 View {perf.promptCount > 1 ? `${perf.promptCount} Prompts` : 'Prompt'} + Weaknesses
                                    </Typography>
                                  </Box>
                                  
                                  <Box 
                                    id={`prompt-details-${tool.toolName}-${perf.tagValue}-${index}`}
                                    sx={{ display: 'none', p: 0.5, borderTop: '1px solid', borderColor: 'divider' }}
                                  >
                                    <Box sx={{ 
                                      fontSize: '0.7rem',
                                      color: 'text.primary',
                                      mb: 0.5,
                                      p: 0.5,
                                      bgcolor: 'background.paper',
                                      borderRadius: 0.5,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      maxHeight: '200px',
                                      overflow: 'auto'
                                    }}>
                                      {perf.allPrompts.length === 1 ? (
                                        <Typography variant="body2" sx={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap' }}>
                                          {perf.allPrompts[0]}
                                        </Typography>
                                      ) : (
                                        perf.allPrompts.map((prompt, promptIndex) => (
                                          <Box key={promptIndex} sx={{ mb: 1, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.7rem', minWidth: 'auto' }}>
                                              •
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap', flex: 1 }}>
                                              {prompt}
                                            </Typography>
                                          </Box>
                                        ))
                                      )}
                                    </Box>
                                    
                                    {weaknesses.length > 0 && (
                                      <Typography variant="caption" display="block" color="error.main" sx={{ fontSize: '0.65rem' }}>
                                        ❌ Key Issues: {weaknesses.join(' • ')}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      );
                    }).filter(Boolean)}
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