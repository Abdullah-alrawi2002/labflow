import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, User, Clock, Reply, CheckCircle, 
  AlertCircle, HelpCircle, Lightbulb, X, MoreVertical
} from 'lucide-react';
import { api } from '../utils/api';

export default function CommentsSection({ experimentId, experimentName }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState('general');
  const [authorName, setAuthorName] = useState(localStorage.getItem('userName') || '');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [experimentId]);

  const fetchComments = async () => {
    try {
      const data = await api.getComments(experimentId);
      setComments(data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !authorName.trim()) return;
    
    localStorage.setItem('userName', authorName);
    
    try {
      await api.createComment(experimentId, {
        content: newComment,
        author_name: authorName,
        comment_type: commentType,
        parent_id: replyingTo
      });
      setNewComment('');
      setReplyingTo(null);
      fetchComments();
    } catch (err) {
      console.error('Failed to create comment:', err);
    }
  };

  const handleResolve = async (commentId) => {
    try {
      await api.resolveComment(commentId);
      fetchComments();
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await api.deleteComment(commentId);
      fetchComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const typeConfig = {
    general: { icon: MessageSquare, color: 'text-gray-500', label: 'Comment' },
    question: { icon: HelpCircle, color: 'text-blue-500', label: 'Question' },
    suggestion: { icon: Lightbulb, color: 'text-yellow-500', label: 'Suggestion' },
    issue: { icon: AlertCircle, color: 'text-red-500', label: 'Issue' },
    approval: { icon: CheckCircle, color: 'text-green-500', label: 'Approval' }
  };

  // Organize comments into threads
  const rootComments = comments.filter(c => !c.parent_id);
  const getRepl = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          Discussion
        </h3>
        <span className="text-xs text-gray-400">{comments.length} comments</span>
      </div>

      {/* Comment Input */}
      <div className="card p-4 space-y-3">
        {replyingTo && (
          <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded">
            <span>Replying to comment...</span>
            <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <div className="flex gap-3">
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name"
            className="input w-32"
          />
          <select
            value={commentType}
            onChange={(e) => setCommentType(e.target.value)}
            className="input w-auto"
          >
            <option value="general">Comment</option>
            <option value="question">Question</option>
            <option value="suggestion">Suggestion</option>
            <option value="issue">Issue</option>
            <option value="approval">Approval</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="input flex-1"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || !authorName.trim()}
            className="btn btn-primary self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center text-gray-400 py-4">Loading comments...</div>
      ) : rootComments.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No comments yet. Start the discussion!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rootComments.map(comment => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={getRepl(comment.id)}
              typeConfig={typeConfig}
              onReply={() => setReplyingTo(comment.id)}
              onResolve={() => handleResolve(comment.id)}
              onDelete={() => handleDelete(comment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentThread({ comment, replies, typeConfig, onReply, onResolve, onDelete }) {
  const [showReplies, setShowReplies] = useState(true);
  const config = typeConfig[comment.comment_type] || typeConfig.general;
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      <div className={`card p-4 ${comment.is_resolved ? 'bg-green-50 border-green-200' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full bg-gray-100 ${config.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">{comment.author_name}</span>
              {comment.author_role && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{comment.author_role}</span>
              )}
              <span className="text-xs text-gray-400">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
              {comment.is_resolved && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Resolved
                </span>
              )}
            </div>
            
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
            
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={onReply}
                className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
              {!comment.is_resolved && comment.comment_type !== 'general' && (
                <button
                  onClick={onResolve}
                  className="text-xs text-gray-500 hover:text-green-600 flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  Resolve
                </button>
              )}
              <button
                onClick={onDelete}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-8 space-y-2 border-l-2 border-gray-100 pl-4">
          {showReplies && replies.map(reply => (
            <div key={reply.id} className="card p-3 bg-gray-50">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">{reply.author_name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(reply.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{reply.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
