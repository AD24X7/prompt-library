import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  LinearProgress,
  Badge,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Reply as ReplyIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Review, Prompt } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ReviewSystemProps {
  prompt: Prompt;
  onAddReview: (review: Partial<Review>) => Promise<void>;
  onAddFollowUp: (parentReviewId: string, review: Partial<Review>) => Promise<void>;
}

interface ToolGroup {
  toolName: string;
  reviews: Review[];
  averageRating: number;
  totalRuns: number;
}

const COMMON_TOOLS = [
  'ChatGPT (GPT-4)',
  'ChatGPT (GPT-3.5)',
  'Claude (Sonnet)',
  'Claude (Haiku)',
  'Claude (Opus)',
  'Gemini Pro',
  'Gemini Ultra',
  'Microsoft Copilot',
  'Perplexity',
  'Other',
];

export const ReviewSystem: React.FC<ReviewSystemProps> = ({
  prompt,
  onAddReview,
  onAddFollowUp,
}) => {
  const { user } = useAuth();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedParentReview, setSelectedParentReview] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState('');
  const [customTool, setCustomTool] = useState('');
  const [newRating, setNewRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [promptEdits, setPromptEdits] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [uploadedScreenshots, setUploadedScreenshots] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Group reviews by tool
  const groupedReviews: ToolGroup[] = React.useMemo(() => {
    const groups: { [tool: string]: Review[] } = {};
    
    // Only include top-level reviews (not follow-ups)
    const topLevelReviews = prompt.reviews.filter(review => !review.parentReviewId);
    
    topLevelReviews.forEach(review => {
      const tool = review.toolUsed || 'Unknown';
      if (!groups[tool]) {
        groups[tool] = [];
      }
      groups[tool].push(review);
    });

    return Object.entries(groups).map(([toolName, reviews]) => ({
      toolName,
      reviews,
      averageRating: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
      totalRuns: reviews.reduce((sum, r) => sum + 1 + (r.followUpReviews?.length || 0), 0),
    })).sort((a, b) => b.totalRuns - a.totalRuns);
  }, [prompt.reviews]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newScreenshots: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          // Convert to base64 for demo - in production, upload to cloud storage
          const base64 = await fileToBase64(file);
          newScreenshots.push(base64);
        }
      }
      setUploadedScreenshots([...uploadedScreenshots, ...newScreenshots]);
    } catch (error) {
      console.error('Failed to upload screenshots:', error);
    } finally {
      setUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmitReview = async () => {
    if (!newRating || (!selectedTool && !customTool)) return;

    const toolUsed = selectedTool === 'Other' ? customTool : selectedTool;
    
    const reviewData: Partial<Review> = {
      rating: newRating,
      comment,
      toolUsed,
      promptEdits: promptEdits || undefined,
      whatWorked: whatWorked || undefined,
      whatDidntWork: whatDidntWork || undefined,
      improvementSuggestions: improvementSuggestions || undefined,
      screenshots: uploadedScreenshots.length > 0 ? uploadedScreenshots : undefined,
    };

    try {
      if (selectedParentReview) {
        await onAddFollowUp(selectedParentReview, reviewData);
        setFollowUpDialogOpen(false);
      } else {
        await onAddReview(reviewData);
        setReviewDialogOpen(false);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const resetForm = () => {
    setSelectedTool('');
    setCustomTool('');
    setNewRating(null);
    setComment('');
    setPromptEdits('');
    setWhatWorked('');
    setWhatDidntWork('');
    setImprovementSuggestions('');
    setUploadedScreenshots([]);
    setSelectedParentReview(null);
  };

  const openFollowUpDialog = (parentReviewId: string) => {
    setSelectedParentReview(parentReviewId);
    setFollowUpDialogOpen(true);
  };

  return (
    <Box>
      {/* Header with emphasis on reviews */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">
          Tool Performance Reviews
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => setReviewDialogOpen(true)}
          disabled={!user}
          sx={{ px: 3, py: 1.5 }}
        >
          Add Review
        </Button>
      </Box>

      {/* Overview Stats */}
      <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {groupedReviews.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tools Tested
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {prompt.reviews.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Reviews
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {prompt.rating.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Rating
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {groupedReviews.reduce((sum, g) => sum + g.totalRuns, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Runs
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tool-grouped Reviews */}
      {groupedReviews.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              No reviews yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Be the first to test this prompt with different AI tools!
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => setReviewDialogOpen(true)}
              disabled={!user}
            >
              Add First Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        groupedReviews.map((toolGroup) => (
          <Card key={toolGroup.toolName} sx={{ mb: 3 }}>
            <Accordion defaultExpanded={groupedReviews.indexOf(toolGroup) === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6">{toolGroup.toolName}</Typography>
                    <Badge badgeContent={toolGroup.totalRuns} color="primary">
                      <Chip label={`${toolGroup.averageRating.toFixed(1)} ⭐`} size="small" />
                    </Badge>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTool(toolGroup.toolName);
                      setReviewDialogOpen(true);
                    }}
                    sx={{ mr: 2 }}
                  >
                    Add Review for {toolGroup.toolName}
                  </Button>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {toolGroup.reviews.map((review, index) => (
                  <Box key={review.id}>
                    <ReviewCard
                      review={review}
                      onAddFollowUp={() => openFollowUpDialog(review.id)}
                      showFollowUpButton={user !== null}
                    />
                    {index < toolGroup.reviews.length - 1 && <Divider sx={{ my: 2 }} />}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          </Card>
        ))
      )}

      {/* Review Dialog */}
      <ReviewDialog
        open={reviewDialogOpen}
        onClose={() => {
          setReviewDialogOpen(false);
          resetForm();
        }}
        onSubmit={handleSubmitReview}
        title="Add New Review"
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        customTool={customTool}
        onCustomToolChange={setCustomTool}
        rating={newRating}
        onRatingChange={setNewRating}
        comment={comment}
        onCommentChange={setComment}
        promptEdits={promptEdits}
        onPromptEditsChange={setPromptEdits}
        whatWorked={whatWorked}
        onWhatWorkedChange={setWhatWorked}
        whatDidntWork={whatDidntWork}
        onWhatDidntWorkChange={setWhatDidntWork}
        improvementSuggestions={improvementSuggestions}
        onImprovementSuggestionsChange={setImprovementSuggestions}
        uploadedScreenshots={uploadedScreenshots}
        onScreenshotsChange={setUploadedScreenshots}
        uploading={uploading}
        onFileUpload={handleFileUpload}
        fileInputRef={fileInputRef}
      />

      {/* Follow-up Dialog */}
      <ReviewDialog
        open={followUpDialogOpen}
        onClose={() => {
          setFollowUpDialogOpen(false);
          resetForm();
        }}
        onSubmit={handleSubmitReview}
        title="Add Follow-up Review"
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        customTool={customTool}
        onCustomToolChange={setCustomTool}
        rating={newRating}
        onRatingChange={setNewRating}
        comment={comment}
        onCommentChange={setComment}
        promptEdits={promptEdits}
        onPromptEditsChange={setPromptEdits}
        whatWorked={whatWorked}
        onWhatWorkedChange={setWhatWorked}
        whatDidntWork={whatDidntWork}
        onWhatDidntWorkChange={setWhatDidntWork}
        improvementSuggestions={improvementSuggestions}
        onImprovementSuggestionsChange={setImprovementSuggestions}
        uploadedScreenshots={uploadedScreenshots}
        onScreenshotsChange={setUploadedScreenshots}
        uploading={uploading}
        onFileUpload={handleFileUpload}
        fileInputRef={fileInputRef}
        isFollowUp={true}
      />
    </Box>
  );
};

// Individual Review Card Component
interface ReviewCardProps {
  review: Review;
  onAddFollowUp: () => void;
  showFollowUpButton: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onAddFollowUp,
  showFollowUpButton,
}) => {
  return (
    <Box>
      <Box display="flex" justifyContent="between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Rating value={review.rating} readOnly size="small" />
          <Typography variant="body2" color="text.secondary">
            {new Date(review.createdAt).toLocaleDateString()}
          </Typography>
        </Box>
        {showFollowUpButton && (
          <Button
            size="small"
            startIcon={<ReplyIcon />}
            onClick={onAddFollowUp}
            variant="outlined"
          >
            Add Follow-up
          </Button>
        )}
      </Box>

      {review.comment && (
        <Typography variant="body1" sx={{ mb: 2, fontStyle: 'italic' }}>
          "{review.comment}"
        </Typography>
      )}

      {review.promptEdits && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
          <Typography variant="subtitle2" color="info.700" gutterBottom>
            ✏️ Prompt Modifications
          </Typography>
          <Typography variant="body2" color="info.800">
            {review.promptEdits}
          </Typography>
        </Box>
      )}

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
            <Box sx={{ p: 2, bgcolor: 'purple.50', borderRadius: 1, border: '1px solid', borderColor: 'purple.200' }}>
              <Typography variant="subtitle2" color="purple.700" gutterBottom>
                💡 Improvement Suggestions
              </Typography>
              <Typography variant="body2" color="purple.800">
                {review.improvementSuggestions}
              </Typography>
            </Box>
          </Grid>
        )}

        {review.screenshots && review.screenshots.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                📸 Screenshots ({review.screenshots.length})
              </Typography>
              <Box display="flex" gap={1} sx={{ overflowX: 'auto' }}>
                {review.screenshots.map((screenshot, index) => (
                  <Box
                    key={index}
                    component="img"
                    src={screenshot}
                    sx={{
                      width: 120,
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'grey.300',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Follow-up reviews */}
      {review.followUpReviews && review.followUpReviews.length > 0 && (
        <Box sx={{ ml: 3, mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'primary.200' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Follow-up reviews ({review.followUpReviews.length})
          </Typography>
          {review.followUpReviews.map((followUp, index) => (
            <Box key={followUp.id} sx={{ mb: index < review.followUpReviews!.length - 1 ? 2 : 0 }}>
              <ReviewCard
                review={followUp}
                onAddFollowUp={() => {}}
                showFollowUpButton={false}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

// Review Dialog Component
interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  selectedTool: string;
  onToolChange: (tool: string) => void;
  customTool: string;
  onCustomToolChange: (tool: string) => void;
  rating: number | null;
  onRatingChange: (rating: number | null) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  promptEdits: string;
  onPromptEditsChange: (edits: string) => void;
  whatWorked: string;
  onWhatWorkedChange: (text: string) => void;
  whatDidntWork: string;
  onWhatDidntWorkChange: (text: string) => void;
  improvementSuggestions: string;
  onImprovementSuggestionsChange: (text: string) => void;
  uploadedScreenshots: string[];
  onScreenshotsChange: (screenshots: string[]) => void;
  uploading: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isFollowUp?: boolean;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onClose,
  onSubmit,
  title,
  selectedTool,
  onToolChange,
  customTool,
  onCustomToolChange,
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  promptEdits,
  onPromptEditsChange,
  whatWorked,
  onWhatWorkedChange,
  whatDidntWork,
  onWhatDidntWorkChange,
  improvementSuggestions,
  onImprovementSuggestionsChange,
  uploadedScreenshots,
  onScreenshotsChange,
  uploading,
  onFileUpload,
  fileInputRef,
  isFollowUp = false,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Tool Selection */}
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth>
              <InputLabel>AI Tool Used *</InputLabel>
              <Select
                value={selectedTool}
                onChange={(e) => onToolChange(e.target.value)}
                label="AI Tool Used *"
              >
                {COMMON_TOOLS.map((tool) => (
                  <MenuItem key={tool} value={tool}>
                    {tool}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedTool === 'Other' && (
              <TextField
                fullWidth
                label="Custom Tool Name"
                value={customTool}
                onChange={(e) => onCustomToolChange(e.target.value)}
                sx={{ mt: 2 }}
                placeholder="Enter tool name..."
              />
            )}
          </Grid>

          {/* Rating */}
          <Grid size={{ xs: 12 }}>
            <Typography component="legend" variant="subtitle1" gutterBottom>
              Overall Rating *
            </Typography>
            <Rating
              value={rating}
              onChange={(event, newValue) => onRatingChange(newValue)}
              size="large"
            />
          </Grid>

          {/* Prompt Edits */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Did you modify the prompt? If yes, what changes?"
              value={promptEdits}
              onChange={(e) => onPromptEditsChange(e.target.value)}
              placeholder="Describe any modifications you made to the original prompt..."
              helperText="This helps others understand what variations work better"
            />
          </Grid>

          {/* Quick comment */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Quick Summary"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Brief overall thoughts about this prompt with this tool..."
            />
          </Grid>

          {/* What worked and didn't work */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="What Worked Well"
              value={whatWorked}
              onChange={(e) => onWhatWorkedChange(e.target.value)}
              placeholder="What generated good results?"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="What Didn't Work"
              value={whatDidntWork}
              onChange={(e) => onWhatDidntWorkChange(e.target.value)}
              placeholder="What could be improved?"
            />
          </Grid>

          {/* Improvement suggestions */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Improvement Suggestions"
              value={improvementSuggestions}
              onChange={(e) => onImprovementSuggestionsChange(e.target.value)}
              placeholder="How could this prompt be improved?"
            />
          </Grid>

          {/* Screenshot Upload */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ p: 2, border: '2px dashed', borderColor: 'primary.300', borderRadius: 2, bgcolor: 'primary.50' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  📸 Upload Screenshots
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Add Screenshots'}
                </Button>
              </Box>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onFileUpload}
              />

              {uploading && <LinearProgress sx={{ mb: 2 }} />}
              
              {uploadedScreenshots.length > 0 && (
                <Box display="flex" gap={1} sx={{ overflowX: 'auto' }}>
                  {uploadedScreenshots.map((screenshot, index) => (
                    <Box key={index} sx={{ position: 'relative', minWidth: 80 }}>
                      <Box
                        component="img"
                        src={screenshot}
                        sx={{
                          width: 80,
                          height: 60,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.300',
                        }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.dark' }
                        }}
                        onClick={() => {
                          const newScreenshots = [...uploadedScreenshots];
                          newScreenshots.splice(index, 1);
                          onScreenshotsChange(newScreenshots);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Upload screenshots showing the AI tool's output, interface, or results
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={!rating || (!selectedTool && !customTool)}
          size="large"
        >
          {isFollowUp ? 'Add Follow-up' : 'Submit Review'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};