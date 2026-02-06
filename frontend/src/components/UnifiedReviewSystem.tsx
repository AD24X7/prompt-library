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
  Avatar,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Reply as ReplyIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { Review, Prompt, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { promptsApi, commentsApi, reviewsApi } from '../utils/api';

interface UnifiedReviewSystemProps {
  prompt: Prompt;
  comments: Comment[];
  onRefresh: () => void;
}

interface ToolGroup {
  toolName: string;
  reviews: Review[];
  comments: Comment[];
  averageRating: number;
  totalEntries: number;
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

export const UnifiedReviewSystem: React.FC<UnifiedReviewSystemProps> = ({
  prompt,
  comments,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'review' | 'comment'>('review');
  const [selectedTool, setSelectedTool] = useState('');
  const [customTool, setCustomTool] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [promptEdits, setPromptEdits] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [uploadedScreenshots, setUploadedScreenshots] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Group content by tool - merge reviews and comments
  const groupedContent: ToolGroup[] = React.useMemo(() => {
    const groups: { [tool: string]: { reviews: Review[]; comments: Comment[] } } = {};
    
    // Group reviews by tool
    prompt.reviews.filter(review => !review.parentReviewId).forEach(review => {
      const tool = review.toolUsed || 'General Discussion';
      if (!groups[tool]) groups[tool] = { reviews: [], comments: [] };
      groups[tool].reviews.push(review);
    });

    // Group comments by tool (if they mention a tool) or put in "General Discussion"
    comments.filter(comment => !comment.parentId).forEach(comment => {
      // Try to extract tool name from comment content
      let tool = 'General Discussion';
      const toolMentions = COMMON_TOOLS.find(t => 
        comment.content.toLowerCase().includes(t.toLowerCase())
      );
      if (toolMentions) tool = toolMentions;
      
      if (!groups[tool]) groups[tool] = { reviews: [], comments: [] };
      groups[tool].comments.push(comment);
    });

    return Object.entries(groups).map(([toolName, content]) => ({
      toolName,
      reviews: content.reviews,
      comments: content.comments,
      averageRating: content.reviews.length > 0 
        ? content.reviews.reduce((sum, r) => sum + r.rating, 0) / content.reviews.length 
        : 0,
      totalEntries: content.reviews.length + content.comments.length,
    })).sort((a, b) => b.totalEntries - a.totalEntries);
  }, [prompt.reviews, comments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newScreenshots: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
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

  const handleSubmit = async () => {
    if (!user) return;

    try {
      if (dialogType === 'review') {
        if (!rating || (!selectedTool && !customTool)) return;
        
        const toolUsed = selectedTool === 'Other' ? customTool : selectedTool;
        
        await promptsApi.addReview(prompt.id, {
          rating: rating,
          comment: content || '',
          toolUsed,
          promptEdits: promptEdits || undefined,
          whatWorked: whatWorked || undefined,
          whatDidntWork: whatDidntWork || undefined,
          improvementSuggestions: improvementSuggestions || undefined,
          screenshots: uploadedScreenshots.length > 0 ? uploadedScreenshots : undefined,
        });
      } else {
        // Add comment
        await commentsApi.createComment(prompt.id, {
          content: content,
          parentId: replyToId || undefined,
        });
      }

      resetForm();
      setDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  };

  const resetForm = () => {
    setSelectedTool('');
    setCustomTool('');
    setRating(null);
    setContent('');
    setPromptEdits('');
    setWhatWorked('');
    setWhatDidntWork('');
    setImprovementSuggestions('');
    setUploadedScreenshots([]);
    setReplyToId(null);
  };

  const openDialog = (type: 'review' | 'comment', tool?: string) => {
    setDialogType(type);
    if (tool && tool !== 'General Discussion') {
      setSelectedTool(tool);
    }
    setDialogOpen(true);
  };


  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">
            Community Feedback & Reviews
          </Typography>
          {prompt.summary && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              💡 Intent: {prompt.summary}
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<ReplyIcon />}
            onClick={() => openDialog('comment')}
            disabled={!user}
          >
            Add Comment
          </Button>
          <Button
            variant="contained"
            startIcon={<StarIcon />}
            onClick={() => openDialog('review')}
            disabled={!user}
            sx={{ px: 3 }}
          >
            Add Review
          </Button>
        </Box>
      </Box>

      {/* Overview Stats */}
      <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {groupedContent.filter(g => g.reviews.length > 0).length}
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
                  Reviews
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {comments.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comments
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
          </Grid>
        </CardContent>
      </Card>

      {/* Grouped Content */}
      {groupedContent.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              No feedback yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Be the first to test this prompt and share your experience!
            </Typography>
            <Box display="flex" justifyContent="center" gap={2}>
              <Button
                variant="outlined"
                onClick={() => openDialog('comment')}
                disabled={!user}
              >
                Add Comment
              </Button>
              <Button
                variant="contained"
                onClick={() => openDialog('review')}
                disabled={!user}
              >
                Add Review
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        groupedContent.map((group) => (
          <Card key={group.toolName} sx={{ mb: 3 }}>
            <Accordion defaultExpanded={groupedContent.indexOf(group) === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6">{group.toolName}</Typography>
                    <Badge badgeContent={group.totalEntries} color="primary">
                      {group.averageRating > 0 && (
                        <Chip 
                          label={`${group.averageRating.toFixed(1)} ⭐`} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Badge>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<ReplyIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDialog('comment', group.toolName);
                      }}
                      disabled={!user}
                    >
                      Comment
                    </Button>
                    <Button
                      size="small"
                      startIcon={<StarIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDialog('review', group.toolName);
                      }}
                      disabled={!user}
                    >
                      Review
                    </Button>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {/* Reviews */}
                {group.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} onUpdate={onRefresh} />
                ))}
                
                {/* Comments */}
                {group.comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}
                
                {group.reviews.length === 0 && group.comments.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No feedback for {group.toolName} yet
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Card>
        ))
      )}

      {/* Unified Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogType === 'review' ? 'Add Review' : 'Add Comment'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {dialogType === 'review' && (
              <>
                {/* Tool Selection */}
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>AI Tool Used *</InputLabel>
                    <Select
                      value={selectedTool}
                      onChange={(e) => setSelectedTool(e.target.value)}
                      label="AI Tool Used *"
                    >
                      {COMMON_TOOLS.map((tool) => (
                        <MenuItem key={tool} value={tool}>{tool}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedTool === 'Other' && (
                    <TextField
                      fullWidth
                      label="Custom Tool Name"
                      value={customTool}
                      onChange={(e) => setCustomTool(e.target.value)}
                      sx={{ mt: 2 }}
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
                    onChange={(event, newValue) => setRating(newValue)}
                    size="large"
                  />
                </Grid>

                {/* Prompt Edits */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Did you modify the prompt? What changes?"
                    value={promptEdits}
                    onChange={(e) => setPromptEdits(e.target.value)}
                    placeholder="Describe any modifications you made..."
                  />
                </Grid>

                {/* What worked and didn't work */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="What Worked Well"
                    value={whatWorked}
                    onChange={(e) => setWhatWorked(e.target.value)}
                    placeholder="What generated good results?"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="What Didn't Work"
                    value={whatDidntWork}
                    onChange={(e) => setWhatDidntWork(e.target.value)}
                    placeholder="What could be improved?"
                  />
                </Grid>

                {/* Improvement suggestions */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Improvement Suggestions"
                    value={improvementSuggestions}
                    onChange={(e) => setImprovementSuggestions(e.target.value)}
                    placeholder="How could this prompt be improved?"
                  />
                </Grid>

                {/* Screenshot Upload */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, border: '2px dashed', borderColor: 'primary.300', borderRadius: 2, bgcolor: 'primary.50' }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="subtitle1">📸 Upload Screenshots</Typography>
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
                      onChange={handleFileUpload}
                    />

                    {uploading && <LinearProgress sx={{ mb: 2 }} />}
                    
                    {uploadedScreenshots.length > 0 && (
                      <Box display="flex" gap={1} sx={{ overflowX: 'auto' }}>
                        {uploadedScreenshots.map((screenshot, index) => (
                          <Box key={index} sx={{ position: 'relative', minWidth: 80 }}>
                            <Box
                              component="img"
                              src={screenshot}
                              sx={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 1 }}
                            />
                            <IconButton
                              size="small"
                              sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'error.main', color: 'white' }}
                              onClick={() => {
                                const newScreenshots = [...uploadedScreenshots];
                                newScreenshots.splice(index, 1);
                                setUploadedScreenshots(newScreenshots);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Grid>
              </>
            )}

            {/* Content field for both review and comment */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={dialogType === 'review' ? 3 : 4}
                label={dialogType === 'review' ? 'Additional Comments' : 'Comment *'}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={dialogType === 'review' 
                  ? 'Any other thoughts or details...' 
                  : 'Share your thoughts, questions, or insights...'}
                required={dialogType === 'comment'}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              dialogType === 'review' 
                ? !rating || (!selectedTool && !customTool)
                : !content.trim()
            }
            size="large"
          >
            {dialogType === 'review' ? 'Submit Review' : 'Post Comment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Review Card Component
const ReviewCard: React.FC<{ review: Review; onUpdate: () => void }> = ({ review, onUpdate }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    rating: review.rating,
    comment: review.comment || '',
    promptEdits: review.promptEdits || '',
    whatWorked: review.whatWorked || '',
    whatDidntWork: review.whatDidntWork || '',
    improvementSuggestions: review.improvementSuggestions || '',
  });

  const isOwnReview = user?.email === review.userEmail || !review.userEmail;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await reviewsApi.update(review.id, editData);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update review:', error);
      // You could add a toast notification here for user feedback
    }
  };

  const handleCancel = () => {
    setEditData({
      rating: review.rating,
      comment: review.comment || '',
      promptEdits: review.promptEdits || '',
      whatWorked: review.whatWorked || '',
      whatDidntWork: review.whatDidntWork || '',
      improvementSuggestions: review.improvementSuggestions || '',
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await reviewsApi.delete(review.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to delete review:', error);
        // You could add a toast notification here for user feedback
      }
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 2, bgcolor: 'background.paper' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          {isEditing ? (
            <Rating 
              value={editData.rating} 
              onChange={(_, value) => setEditData(prev => ({ ...prev, rating: value || 0 }))}
              size="small" 
            />
          ) : (
            <Rating value={review.rating} readOnly size="small" />
          )}
          <Typography variant="body2" color="text.secondary">
            {new Date(review.createdAt).toLocaleDateString()}
          </Typography>
        </Box>
        
        {isOwnReview && (
          <Box display="flex" gap={0.5}>
            {!isEditing ? (
              <>
                <IconButton size="small" onClick={handleEdit}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={handleDelete} color="error">
                  <DeleteIcon />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton size="small" onClick={handleSave} color="primary">
                  <SaveIcon />
                </IconButton>
                <IconButton size="small" onClick={handleCancel}>
                  <CancelIcon />
                </IconButton>
              </>
            )}
          </Box>
        )}
      </Box>

      {isEditing ? (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comment"
            value={editData.comment}
            onChange={(e) => setEditData(prev => ({ ...prev, comment: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Prompt Modifications"
            value={editData.promptEdits}
            onChange={(e) => setEditData(prev => ({ ...prev, promptEdits: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="What Worked"
            value={editData.whatWorked}
            onChange={(e) => setEditData(prev => ({ ...prev, whatWorked: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="What Didn't Work"
            value={editData.whatDidntWork}
            onChange={(e) => setEditData(prev => ({ ...prev, whatDidntWork: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Improvement Suggestions"
            value={editData.improvementSuggestions}
            onChange={(e) => setEditData(prev => ({ ...prev, improvementSuggestions: e.target.value }))}
          />
        </Box>
      ) : (
        <>
          {review.comment && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              {review.comment}
            </Typography>
          )}

          {/* Debug: Show all review properties */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', fontSize: '0.75rem' }}>
              Debug: Review has - whatWorked: {review.whatWorked ? 'Yes' : 'No'}, 
              whatDidntWork: {review.whatDidntWork ? 'Yes' : 'No'}, 
              promptEdits: {review.promptEdits ? 'Yes' : 'No'},
              improvementSuggestions: {review.improvementSuggestions ? 'Yes' : 'No'}
            </Box>
          )}

          {review.promptEdits && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
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
                <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
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
                <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
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
                <Box sx={{ p: 2, bgcolor: 'purple.50', borderRadius: 1 }}>
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
                        sx={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 1 }}
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </>
      )}
    </Paper>
  );
};

// Comment Card Component
const CommentCard: React.FC<{ comment: Comment }> = ({ comment }) => (
  <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
    <Box display="flex" alignItems="flex-start" gap={2}>
      <Avatar src={comment.user.avatar} sx={{ width: 32, height: 32 }}>
        {comment.user.name[0]}
      </Avatar>
      <Box sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {comment.user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(comment.createdAt).toLocaleDateString()}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {comment.content}
        </Typography>
      </Box>
    </Box>

    {/* Render replies */}
    {comment.replies && comment.replies.length > 0 && (
      <Box sx={{ ml: 5, mt: 1 }}>
        {comment.replies.map((reply) => (
          <CommentCard key={reply.id} comment={reply} />
        ))}
      </Box>
    )}
  </Paper>
);