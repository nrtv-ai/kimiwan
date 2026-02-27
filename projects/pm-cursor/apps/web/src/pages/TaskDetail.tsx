import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  User,
  AlertCircle,
  Clock,
  MessageSquare,
  Paperclip,
  Edit2,
  Trash2,
  Send,
  CheckCircle2,
  Circle,
  Clock4,
  X,
  Upload,
  FileText,
  Image,
  Download,
  File,
} from 'lucide-react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  estimatedHours: number | null;
  projectId: string;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  authorType: string;
  createdAt: string;
  editedAt: string | null;
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  taskId: string;
  uploadedBy: string;
  createdAt: string;
  uploadedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

const statusOptions = [
  { value: 'backlog', label: 'Backlog', icon: Circle, color: 'text-gray-500' },
  { value: 'todo', label: 'To Do', icon: Circle, color: 'text-blue-500' },
  { value: 'in_progress', label: 'In Progress', icon: Clock4, color: 'text-yellow-500' },
  { value: 'in_review', label: 'In Review', icon: AlertCircle, color: 'text-purple-500' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'cancelled', label: 'Cancelled', icon: X, color: 'text-red-500' },
] as const;

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
] as const;

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { joinProject, leaveProject, onTaskUpdated, onTaskDeleted, onCommentCreated, onCommentUpdated, onCommentDeleted, onAttachmentCreated, onAttachmentDeleted } = useSocket();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async (): Promise<Task> => {
      const res = await api.get(`/tasks/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['task-comments', id],
    queryFn: async (): Promise<Comment[]> => {
      const res = await api.get(`/tasks/${id}/comments`);
      return res.data.data || [];
    },
    enabled: !!id,
  });

  const { data: attachments, isLoading: attachmentsLoading } = useQuery({
    queryKey: ['task-attachments', id],
    queryFn: async (): Promise<Attachment[]> => {
      const res = await api.get(`/tasks/${id}/attachments`);
      return res.data.data || [];
    },
    enabled: !!id,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data || [];
    },
  });

  // Join project room for real-time updates
  useEffect(() => {
    if (task?.projectId) {
      joinProject(task.projectId);
      return () => {
        leaveProject(task.projectId);
      };
    }
  }, [task?.projectId, joinProject, leaveProject]);

  // Listen for real-time task updates
  useEffect(() => {
    const unsubscribeUpdate = onTaskUpdated((updatedTask) => {
      if (updatedTask.id === id) {
        queryClient.setQueryData(['task', id], (old: Task | undefined) => {
          if (!old) return old;
          return { ...old, ...updatedTask };
        });
      }
    });

    const unsubscribeDelete = onTaskDeleted((deletedTask) => {
      if (deletedTask.id === id) {
        navigate('/tasks');
      }
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [id, onTaskUpdated, onTaskDeleted, queryClient, navigate]);

  // Listen for real-time comment updates
  useEffect(() => {
    const unsubscribeCreated = onCommentCreated((newComment) => {
      if (newComment.taskId === id) {
        queryClient.invalidateQueries({ queryKey: ['task-comments', id] });
      }
    });

    const unsubscribeUpdated = onCommentUpdated((updatedComment) => {
      if (updatedComment.taskId === id) {
        queryClient.setQueryData(['task-comments', id], (old: Comment[] | undefined) => {
          if (!old) return old;
          return old.map(c => c.id === updatedComment.id ? { ...c, ...updatedComment } : c);
        });
      }
    });

    const unsubscribeDeleted = onCommentDeleted((deletedComment) => {
      if (deletedComment.taskId === id) {
        queryClient.setQueryData(['task-comments', id], (old: Comment[] | undefined) => {
          if (!old) return old;
          return old.filter(c => c.id !== deletedComment.id);
        });
      }
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [id, onCommentCreated, onCommentUpdated, onCommentDeleted, queryClient]);

  // Listen for real-time attachment updates
  useEffect(() => {
    const unsubscribeCreated = onAttachmentCreated((newAttachment) => {
      if (newAttachment.taskId === id) {
        queryClient.invalidateQueries({ queryKey: ['task-attachments', id] });
      }
    });

    const unsubscribeDeleted = onAttachmentDeleted((deletedAttachment) => {
      if (deletedAttachment.taskId === id) {
        queryClient.setQueryData(['task-attachments', id], (old: Attachment[] | undefined) => {
          if (!old) return old;
          return old.filter(a => a.id !== deletedAttachment.id);
        });
      }
    });

    return () => {
      unsubscribeCreated();
      unsubscribeDeleted();
    };
  }, [id, onAttachmentCreated, onAttachmentDeleted, queryClient]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const res = await api.patch(`/tasks/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/tasks');
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/tasks/${id}/comments`, { content });
      return res.data.data;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['task-comments', id] });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const res = await api.patch(`/tasks/${id}/comments/${commentId}`, { content });
      return res.data.data;
    },
    onSuccess: () => {
      setEditingCommentId(null);
      setEditCommentContent('');
      queryClient.invalidateQueries({ queryKey: ['task-comments', id] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/tasks/${id}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', id] });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/tasks/${id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', id] });
      setIsUploading(false);
    },
    onError: () => {
      setIsUploading(false);
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/tasks/${id}/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', id] });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadAttachmentMutation.mutate(file);
    }
  };

  useEffect(() => {
    if (task) {
      setEditForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
      });
    }
  }, [task]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Task not found</h3>
        <button
          onClick={() => navigate('/tasks')}
          className="mt-4 text-indigo-600 hover:text-indigo-700"
        >
          Go back to tasks
        </button>
      </div>
    );
  }

  const currentStatus = statusOptions.find((s) => s.value === task.status);
  const currentPriority = priorityOptions.find((p) => p.value === task.priority);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tasks
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this task?')) {
                deleteMutation.mutate();
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Task Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateMutation.mutate(editForm)}
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                  {task.aiGenerated && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      AI Generated
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-gray-600 mt-4 whitespace-pre-wrap">{task.description}</p>
                )}
              </>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments ({comments?.length || 0})
            </h2>

            <div className="space-y-4">
              {/* Comment Input */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <button
                  onClick={() => commentMutation.mutate(newComment)}
                  disabled={!newComment.trim() || commentMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Comments List */}
              {commentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-4 mt-6">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-sm">
                        {comment.author?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{comment.author?.name || 'Unknown'}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                          {comment.editedAt && (
                            <span className="text-xs text-gray-400">(edited)</span>
                          )}
                        </div>
                        
                        {editingCommentId === comment.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateCommentMutation.mutate({ commentId: comment.id, content: editCommentContent })}
                                disabled={!editCommentContent.trim() || updateCommentMutation.isPending}
                                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditCommentContent('');
                                }}
                                className="px-3 py-1 text-gray-600 text-sm hover:bg-gray-100 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-600 mt-1">{comment.content}</p>
                            <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditCommentContent(comment.content);
                                }}
                                className="text-xs text-gray-500 hover:text-indigo-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this comment?')) {
                                    deleteCommentMutation.mutate(comment.id);
                                  }
                                }}
                                className="text-xs text-gray-500 hover:text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
              )}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Attachments ({attachments?.length || 0})
            </h2>

            <div className="space-y-4">
              {/* Upload Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload File
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Max file size: 10MB. Supported: images, PDFs, documents, JSON, ZIP
                </p>
              </div>

              {/* Attachments List */}
              {attachmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                </div>
              ) : attachments && attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <AttachmentItem
                      key={attachment.id}
                      attachment={attachment}
                      onDelete={() => {
                        if (confirm('Delete this attachment?')) {
                          deleteAttachmentMutation.mutate(attachment.id);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No attachments yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Task Properties */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Properties</h3>
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {currentStatus && (
                      <>
                        <currentStatus.icon className={`w-4 h-4 ${currentStatus.color}`} />
                        <span>{currentStatus.label}</span>
                      </>
                    )}
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => {
                            updateMutation.mutate({ status: status.value });
                            setShowStatusDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                        >
                          <status.icon className={`w-4 h-4 ${status.color}`} />
                          <span>{status.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                <div className="relative">
                  <button
                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                    className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {currentPriority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${currentPriority.color}`}>
                        {currentPriority.label}
                      </span>
                    )}
                  </button>
                  {showPriorityDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      {priorityOptions.map((priority) => (
                        <button
                          key={priority.value}
                          onClick={() => {
                            updateMutation.mutate({ priority: priority.value });
                            setShowPriorityDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                        >
                          <span className={`px-2 py-0.5 rounded-full text-xs ${priority.color}`}>
                            {priority.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Assignee</label>
                <select
                  value={task.assigneeId || ''}
                  onChange={(e) => updateMutation.mutate({ assigneeId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateMutation.mutate({ dueDate: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estimated Hours</label>
                <input
                  type="number"
                  value={task.estimatedHours || ''}
                  onChange={(e) => updateMutation.mutate({ estimatedHours: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Created {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Updated {format(new Date(task.updatedAt), 'MMM d, yyyy')}</span>
              </div>
              {task.creator && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Created by {task.creator.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper function to get file icon based on mime type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

// Attachment Item Component
interface AttachmentItemProps {
  attachment: Attachment;
  onDelete: () => void;
}

function AttachmentItem({ attachment, onDelete }: AttachmentItemProps) {
  const Icon = getFileIcon(attachment.mimeType);
  
  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group">
      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachment.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(attachment.size)} • Uploaded by {attachment.uploadedByUser?.name || 'Unknown'}
        </p>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${attachment.url}`}
          download={attachment.name}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          onClick={onDelete}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
