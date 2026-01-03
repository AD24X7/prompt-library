import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Rating,
  TextField,
  Grid,
  Divider,
  Card,
  CardContent,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Star as StarIcon,
  AccessTime as TimeIcon,
  TrendingUp as UsageIcon,
  ArrowBack as BackIcon,
  PlayArrow as TestIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { promptsApi } from '../utils/api';
import { Prompt } from '../types';
import { formatPlaceholder, extractPlaceholders, replacePlaceholdersInPrompt } from '../utils/promptUtils';
import { useAuth } from '../contexts/AuthContext';
import { AuthDialog } from '../components/AuthDialog';
import { Comments } from '../components/Comments';

export const PromptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [customizedPrompt, setCustomizedPrompt] = useState('');
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [newRating, setNewRating] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [toolUsed, setToolUsed] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [testRunGraphicsLink, setTestRunGraphicsLink] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'delete' | 'review' | 'edit' | null>(null);

  useEffect(() => {
    if (id) {
      fetchPrompt(id);
    }
  }, [id]);

  // Set up test inputs when test dialog opens AND placeholders are enabled
  useEffect(() => {
    if (testDialogOpen && prompt && showPlaceholders) {
      const inputs = detectPlaceholders(prompt.prompt);
      setTestInputs(inputs);
    } else if (testDialogOpen && !showPlaceholders) {
      setTestInputs({});
    }
  }, [testDialogOpen, prompt, showPlaceholders]);

  const fetchPrompt = async (promptId: string) => {
    try {
      const response = await promptsApi.getById(promptId);
      setPrompt((response.data || response) as unknown as Prompt);
      const promptData = (response.data || response) as unknown as Prompt;
      setCustomizedPrompt(promptData.prompt);
      
      // Auto-enable placeholders for recently created prompts (within 5 minutes)
      const promptAge = Date.now() - new Date(promptData.createdAt).getTime();
      const isRecentlyCreated = promptAge < 5 * 60 * 1000; // 5 minutes
      
      if (isRecentlyCreated && promptData.placeholders && promptData.placeholders.length > 0) {
        setShowPlaceholders(true);
      }
    } catch (error) {
      setError('Failed to load prompt');
      console.error('Failed to fetch prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectPlaceholders = (promptText: string): Record<string, string> => {
    // Use stored placeholders if available, otherwise extract from text
    const placeholderNames = prompt?.placeholders || [];
    let detectedPlaceholders: string[] = [];
    
    if (placeholderNames.length > 0) {
      detectedPlaceholders = placeholderNames;
    } else {
      // Fallback to extracting from text using utility function
      detectedPlaceholders = extractPlaceholders(promptText);
    }
    
    const inputs: Record<string, string> = {};
    detectedPlaceholders.forEach(placeholder => {
      inputs[placeholder] = '';
    });
    return inputs;
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleTestPrompt = () => {
    if (!prompt) return;
    
    const processedPrompt = replacePlaceholdersInPrompt(prompt.prompt, testInputs);
    setCustomizedPrompt(processedPrompt);
    
    // Track usage
    promptsApi.trackUsage(prompt.id).catch(console.error);
  };

  const handleDetectPlaceholders = () => {
    if (!prompt) return;
    
    setShowPlaceholders(true);
    const inputs = detectPlaceholders(prompt.prompt);
    setTestInputs(inputs);
  };

  const requireAuth = (action: 'delete' | 'review' | 'edit', callback: () => void) => {
    if (!user) {
      setPendingAction(action);
      setAuthDialogOpen(true);
      return;
    }
    callback();
  };

  const handleAuthSuccess = async () => {
    setAuthDialogOpen(false);
    
    // Execute pending action after successful auth
    if (pendingAction === 'delete') {
      if (!prompt) return;
      
      if (window.confirm('Are you sure you want to delete this prompt?')) {
        try {
          await promptsApi.delete(prompt.id);
          navigate('/prompts');
        } catch (error) {
          setError('Failed to delete prompt');
          console.error('Delete failed:', error);
        }
      }
    } else if (pendingAction === 'review') {
      setReviewDialogOpen(true);
    } else if (pendingAction === 'edit') {
      if (!prompt) return;
      navigate(`/edit/${prompt.id}`);
    }
    
    setPendingAction(null);
  };

  const handleDeletePrompt = async () => {
    if (!user) {
      setPendingAction('delete');
      setAuthDialogOpen(true);
      return;
    }

    if (!prompt) return;
    
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await promptsApi.delete(prompt.id);
        navigate('/prompts');
      } catch (error) {
        setError('Failed to delete prompt');
        console.error('Delete failed:', error);
      }
    }
  };

  const handleEditPrompt = () => {
    requireAuth('edit', () => {
      if (!prompt) return;
      // Navigate to edit page (we'll create this)
      navigate(`/edit/${prompt.id}`);
    });
  };

  const handleReviewPrompt = () => {
    // Users can view reviews without auth, but need auth to add new reviews
    if (!user) {
      setPendingAction('review');
      setAuthDialogOpen(true);
      return;
    }
    setReviewDialogOpen(true);
  };

  const handleAddReview = async () => {
    if (!prompt || !newRating) return;

    try {
      await promptsApi.addReview(prompt.id, {
        rating: newRating,
        comment: newComment,
        toolUsed: toolUsed || undefined,
        whatWorked: whatWorked || undefined,
        whatDidntWork: whatDidntWork || undefined,
        improvementSuggestions: improvementSuggestions || undefined,
        testRunGraphicsLink: testRunGraphicsLink || undefined,
      });
      
      // Refresh prompt data to show new review
      await fetchPrompt(prompt.id);
      setReviewDialogOpen(false);
      setNewRating(null);
      setNewComment('');
      setToolUsed('');
      setWhatWorked('');
      setWhatDidntWork('');
      setImprovementSuggestions('');
    } catch (error) {
      console.error('Failed to add review:', error);
    }
  };

  // Remove old handleDelete function - using handleDeletePrompt instead

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !prompt) {
    return (
      <Box>
        <Alert severity="error">{error || 'Prompt not found'}</Alert>
        <Button 
          startIcon={<BackIcon />} 
          onClick={() => navigate('/prompts')}
          sx={{ mt: 2 }}
        >
          Back to Prompts
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Button 
            startIcon={<BackIcon />} 
            onClick={() => navigate('/prompts')}
            sx={{ mb: 1 }}
          >
            Back to Prompts
          </Button>
          <Typography variant="h4" gutterBottom>
            {prompt.title}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Test Prompt">
            <IconButton color="primary" onClick={() => setTestDialogOpen(true)}>
              <TestIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy Prompt">
            <IconButton onClick={() => handleCopyToClipboard(prompt.prompt)}>
              <CopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add Review">
            <IconButton onClick={handleReviewPrompt}>
              <StarIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Prompt">
            <IconButton onClick={handleEditPrompt}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={handleDeletePrompt}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {prompt.description || 'No description provided.'}
            </Typography>

            <Typography variant="h6" gutterBottom>
              Prompt
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {prompt.prompt}
              </Typography>
            </Paper>

            <Box display="flex" justifyContent="flex-end" gap={1} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={() => handleCopyToClipboard(prompt.prompt)}
                size="small"
              >
                Copy
              </Button>
              <Button
                variant="contained"
                startIcon={<TestIcon />}
                onClick={() => setTestDialogOpen(true)}
                size="small"
              >
                Test & Customize
              </Button>
            </Box>
          </Paper>

          {/* Reviews */}
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Reviews ({prompt.reviews?.length || 0})
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={handleReviewPrompt}
              >
                Add Review
              </Button>
            </Box>
            
            {prompt.reviews && prompt.reviews.length > 0 ? (
              prompt.reviews.map((review) => (
                <Card key={review.id} sx={{ mb: 3 }} variant="outlined">
                  <CardContent>
                    {/* Review Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Rating value={review.rating} readOnly size="small" />
                        <Typography variant="body2" color="text.secondary">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      {review.toolUsed && (
                        <Chip 
                          label={review.toolUsed} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                      )}
                    </Box>

                    {/* General Comment */}
                    {review.comment && (
                      <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                        "{review.comment}"
                      </Typography>
                    )}

                    {/* Detailed Sections */}
                    <Grid container spacing={2}>
                      {review.whatWorked && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                            <Typography variant="subtitle2" color="success.700" gutterBottom>
                              ✅ What Worked
                            </Typography>
                            <Typography variant="body2" color="success.800">
                              {review.whatWorked}
                            </Typography>
                          </Box>
                        </Grid>
                      )}

                      {review.whatDidntWork && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
                            <Typography variant="subtitle2" color="warning.700" gutterBottom>
                              ⚠️ What Didn't Work
                            </Typography>
                            <Typography variant="body2" color="warning.800">
                              {review.whatDidntWork}
                            </Typography>
                          </Box>
                        </Grid>
                      )}

                      {review.improvementSuggestions && (
                        <Grid size={{ xs: 12 }}>
                          <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                            <Typography variant="subtitle2" color="info.700" gutterBottom>
                              💡 Improvement Suggestions
                            </Typography>
                            <Typography variant="body2" color="info.800">
                              {review.improvementSuggestions}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {review.testRunGraphicsLink && (
                        <Grid size={{ xs: 12 }}>
                          <Box sx={{ p: 2, bgcolor: 'purple.50', borderRadius: 1, border: '1px solid', borderColor: 'purple.200' }}>
                            <Typography variant="subtitle2" color="purple.700" gutterBottom>
                              📸 Test Run Graphics
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              href={review.testRunGraphicsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: 'purple.700', borderColor: 'purple.300' }}
                            >
                              View Screenshots/Videos
                            </Button>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No reviews yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Be the first to test and review this prompt!
                </Typography>
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={handleReviewPrompt}
                >
                  Add First Review
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Details
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Category
              </Typography>
              <Chip label={prompt.category} variant="outlined" />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Difficulty
              </Typography>
              <Chip 
                label={prompt.difficulty} 
                color={getDifficultyColor(prompt.difficulty) as any}
                variant="filled"
              />
            </Box>

            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <TimeIcon fontSize="small" />
              <Typography variant="body2">
                {prompt.estimatedTime}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <StarIcon fontSize="small" />
              <Typography variant="body2">
                {prompt.rating.toFixed(1)} ({prompt.reviews?.length || 0} reviews)
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <UsageIcon fontSize="small" />
              <Typography variant="body2">
                Used {prompt.usageCount} times
              </Typography>
            </Box>

            {prompt.tags && prompt.tags.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Tags
                </Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {prompt.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Metadata
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(prompt.createdAt).toLocaleDateString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updated: {new Date(prompt.updatedAt).toLocaleDateString()}
            </Typography>
            {prompt.lastUsed && (
              <Typography variant="body2" color="text.secondary">
                Last used: {new Date(prompt.lastUsed).toLocaleDateString()}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Comments Section */}
      <Box sx={{ mt: 4 }}>
        <Comments promptId={prompt?.id || ''} />
      </Box>

      {/* Test Dialog */}
      <Dialog 
        open={testDialogOpen} 
        onClose={() => {
          setTestDialogOpen(false);
          setShowPlaceholders(false);
          setTestInputs({});
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Test & Customize Prompt</DialogTitle>
        <DialogContent>
          {!showPlaceholders && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This prompt may contain placeholders that you can customize
              </Typography>
              <Button 
                variant="outlined" 
                onClick={handleDetectPlaceholders}
                startIcon={<TestIcon />}
              >
                Detect Placeholders
              </Button>
            </Box>
          )}
          
          {Object.keys(testInputs).length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  Fill in the placeholders:
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => {
                    setShowPlaceholders(false);
                    setTestInputs({});
                  }}
                >
                  Hide Placeholders
                </Button>
              </Box>
              <Grid container spacing={2}>
                {Object.entries(testInputs).map(([key, value]) => (
                  <Grid size={{ xs: 12, md: 6 }} key={key}>
                    <TextField
                      fullWidth
                      label={formatPlaceholder(key)}
                      value={value}
                      onChange={(e) => setTestInputs(prev => ({
                        ...prev,
                        [key]: e.target.value
                      }))}
                      size="small"
                      placeholder={`Enter ${formatPlaceholder(key).toLowerCase()}...`}
                    />
                  </Grid>
                ))}
              </Grid>
              <Button 
                variant="outlined" 
                onClick={handleTestPrompt}
                sx={{ mt: 2 }}
              >
                Apply Values
              </Button>
            </Box>
          )}
          
          <Typography variant="subtitle1" gutterBottom>
            Customized Prompt:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={8}
            value={customizedPrompt}
            onChange={(e) => setCustomizedPrompt(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTestDialogOpen(false);
            setShowPlaceholders(false);
            setTestInputs({});
          }}>Cancel</Button>
          <Button onClick={() => handleCopyToClipboard(customizedPrompt)} variant="outlined">
            Copy Customized
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Review Dialog */}
      <Dialog 
        open={reviewDialogOpen} 
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Detailed Review</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Overall Rating */}
            <Grid size={{ xs: 12 }}>
              <Box>
                <Typography component="legend" variant="subtitle1" gutterBottom>
                  Overall Rating *
                </Typography>
                <Rating
                  value={newRating}
                  onChange={(event, newValue) => setNewRating(newValue)}
                  size="large"
                />
              </Box>
            </Grid>

            {/* Tool Used */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Tool/LLM Used"
                value={toolUsed}
                onChange={(e) => setToolUsed(e.target.value)}
                placeholder="e.g., GPT-4, Claude, Gemini..."
                helperText="Which AI tool did you test this prompt with?"
              />
            </Grid>

            {/* Execution Context */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="General Comments"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Overall thoughts about this prompt..."
                multiline
                rows={2}
              />
            </Grid>

            {/* What Worked */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="What Worked Well"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                placeholder="Describe what aspects of this prompt were effective..."
                helperText="What generated good results?"
              />
            </Grid>

            {/* What Didn't Work */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="What Didn't Work"
                value={whatDidntWork}
                onChange={(e) => setWhatDidntWork(e.target.value)}
                placeholder="Describe any issues or limitations..."
                helperText="What could be improved?"
              />
            </Grid>

            {/* Improvement Suggestions */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Improvement Suggestions"
                value={improvementSuggestions}
                onChange={(e) => setImprovementSuggestions(e.target.value)}
                placeholder="How could this prompt be improved? Alternative approaches?"
                helperText="Specific suggestions for enhancing this prompt"
              />
            </Grid>
            {/* Test Run Graphics Link */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Test Run Graphics Link"
                value={testRunGraphicsLink}
                onChange={(e) => setTestRunGraphicsLink(e.target.value)}
                placeholder="https://your-link-to-screenshots-videos-etc.com"
                helperText="Link to screenshots, videos, or other graphics showing test execution"
              />
            </Grid>

            {/* Future: Media Upload Section */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px dashed grey.300' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  📎 Media Attachments (Coming Soon)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload screenshots, videos, or other files showing your prompt execution results.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddReview}
            variant="contained"
            disabled={!newRating}
            size="large"
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onClose={() => {
          setAuthDialogOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleAuthSuccess}
        initialTab="signin"
      />
    </Box>
  );
};