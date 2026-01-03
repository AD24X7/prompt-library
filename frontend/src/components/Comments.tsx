import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Reply as ReplyIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as SignUpIcon,
} from '@mui/icons-material';
import { Comment } from '../types';
import { commentsApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AuthDialog } from './AuthDialog';

interface CommentsProps {
  promptId: string;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: string) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  currentUserId?: string;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
  level = 0,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const isOwner = currentUserId === comment.userId;
  const maxLevel = 3; // Maximum nesting level

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return commentDate.toLocaleDateString();
  };

  return (
    <Box sx={{ mb: 2, ml: level * 3 }}>
      <Paper variant="outlined" sx={{ p: 2, bgcolor: level > 0 ? 'grey.50' : 'background.paper' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" gap={1} sx={{ flexGrow: 1 }}>
            <Avatar src={comment.user.avatar} sx={{ width: 32, height: 32 }}>
              {comment.user.name[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {comment.user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {timeAgo(comment.createdAt)}
                </Typography>
                {comment.updatedAt !== comment.createdAt && (
                  <Chip label="edited" size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {comment.content}
              </Typography>
              <Box display="flex" gap={1} sx={{ mt: 1 }}>
                {level < maxLevel && (
                  <Button
                    size="small"
                    startIcon={<ReplyIcon />}
                    onClick={() => onReply(comment.id)}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Reply
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
          
          {isOwner && (
            <Box>
              <IconButton size="small" onClick={handleMenuClick}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={() => { onEdit(comment); handleMenuClose(); }}>
                  <EditIcon fontSize="small" sx={{ mr: 1 }} />
                  Edit
                </MenuItem>
                <MenuItem onClick={() => { onDelete(comment.id); handleMenuClose(); }} sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  Delete
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Render replies */}
      {comment.replies.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={currentUserId}
              level={level + 1}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export const Comments: React.FC<CommentsProps> = ({ promptId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [promptId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await commentsApi.getComments(promptId);
      setComments(response.data || response);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }

    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      const response = await commentsApi.createComment(promptId, {
        content: newComment,
        parentId: replyToId || undefined,
      });

      // Add new comment to the list
      if (replyToId) {
        // Find parent comment and add reply
        const updatedComments = addReplyToComment(comments, replyToId, response.data);
        setComments(updatedComments);
      } else {
        // Add as top-level comment
        setComments([...comments, response.data]);
      }

      setNewComment('');
      setReplyToId(null);
      setError('');
    } catch (error: any) {
      console.error('Failed to create comment:', error);
      setError(error.response?.data?.error || 'Failed to create comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async () => {
    if (!editingComment || !editContent.trim()) return;

    try {
      await commentsApi.updateComment(editingComment.id, { content: editContent });
      
      // Update comment in the list
      const updatedComments = updateCommentContent(comments, editingComment.id, editContent);
      setComments(updatedComments);
      
      setEditingComment(null);
      setEditContent('');
    } catch (error: any) {
      console.error('Failed to update comment:', error);
      setError(error.response?.data?.error || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentsApi.deleteComment(commentId);
      
      // Remove comment from the list
      const updatedComments = removeComment(comments, commentId);
      setComments(updatedComments);
      
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
      setError(error.response?.data?.error || 'Failed to delete comment');
    }
  };

  const addReplyToComment = (commentsList: Comment[], parentId: string, newReply: Comment): Comment[] => {
    return commentsList.map(comment => {
      if (comment.id === parentId) {
        return { ...comment, replies: [...comment.replies, newReply] };
      }
      if (comment.replies.length > 0) {
        return { ...comment, replies: addReplyToComment(comment.replies, parentId, newReply) };
      }
      return comment;
    });
  };

  const updateCommentContent = (commentsList: Comment[], commentId: string, newContent: string): Comment[] => {
    return commentsList.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, content: newContent, updatedAt: new Date().toISOString() };
      }
      if (comment.replies.length > 0) {
        return { ...comment, replies: updateCommentContent(comment.replies, commentId, newContent) };
      }
      return comment;
    });
  };

  const removeComment = (commentsList: Comment[], commentId: string): Comment[] => {
    return commentsList.filter(comment => {
      if (comment.id === commentId) return false;
      if (comment.replies.length > 0) {
        comment.replies = removeComment(comment.replies, commentId);
      }
      return true;
    });
  };

  const handleReply = (parentId: string) => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }
    setReplyToId(parentId);
  };

  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  const getReplyToComment = (commentsList: Comment[], parentId: string): Comment | null => {
    for (const comment of commentsList) {
      if (comment.id === parentId) return comment;
      if (comment.replies.length > 0) {
        const found = getReplyToComment(comment.replies, parentId);
        if (found) return found;
      }
    }
    return null;
  };

  const replyToComment = replyToId ? getReplyToComment(comments, replyToId) : null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Comments ({comments.reduce((total, comment) => total + 1 + comment.replies.length, 0)})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Comment Form */}
      <Box sx={{ mb: 3 }}>
        {replyToId && replyToComment && (
          <Box sx={{ mb: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Replying to <strong>{replyToComment.user.name}</strong>
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
              "{replyToComment.content.substring(0, 100)}{replyToComment.content.length > 100 ? '...' : ''}"
            </Typography>
            <Button size="small" onClick={() => setReplyToId(null)} sx={{ mt: 0.5 }}>
              Cancel Reply
            </Button>
          </Box>
        )}
        
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder={user ? "Add a comment..." : "Sign in to add a comment"}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={!user || submitting}
          sx={{ mb: 1 }}
        />
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            {!user && (
              <Button
                startIcon={<SignUpIcon />}
                onClick={() => setAuthDialogOpen(true)}
              >
                Sign in to comment
              </Button>
            )}
          </Box>
          
          {user && (
            <Button
              variant="contained"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? <CircularProgress size={20} /> : replyToId ? 'Reply' : 'Comment'}
            </Button>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Comments List */}
      {comments.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No comments yet. Be the first to share your thoughts!
          </Typography>
        </Box>
      ) : (
        <Box>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteConfirmId(id)}
              currentUserId={user?.id}
            />
          ))}
        </Box>
      )}

      {/* Edit Comment Dialog */}
      <Dialog open={Boolean(editingComment)} onClose={() => setEditingComment(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Comment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingComment(null)}>Cancel</Button>
          <Button onClick={handleEditComment} variant="contained" disabled={!editContent.trim()}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Delete Comment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this comment? This action cannot be undone and will also delete all replies.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button 
            onClick={() => deleteConfirmId && handleDeleteComment(deleteConfirmId)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auth Dialog */}
      <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
    </Box>
  );
};