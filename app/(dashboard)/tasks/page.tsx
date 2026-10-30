'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  CheckSquare,
  Plus,
  Clock,
  MessageSquare,
  AlertCircle,
  X,
  User,
  Calendar,
  Eye,
} from 'lucide-react';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function TasksPage() {
  const { user, activeStoreId } = useAuth();

  const [tasks, setTasks] = useState<any[]>([]);
  const [storeUsers, setStoreUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    assignedTo: '',
  });

  const loadTasks = () => {
    setLoading(true);
    let url = '/api/tasks?';
    if (activeStoreId) url += `storeId=${activeStoreId}&`;
    if (statusFilter) url += `status=${statusFilter}&`;
    if (priorityFilter) url += `priority=${priorityFilter}&`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTasks(json.data.tasks || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Load assignable employees
  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Store Manager') {
      let url = '/api/users';
      if (activeStoreId) url += `?storeId=${activeStoreId}`;
      fetch(url)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setStoreUsers(json.data.users || []);
        })
        .catch(console.error);
    }
  }, [activeStoreId, user]);

  useEffect(() => {
    loadTasks();
  }, [activeStoreId, statusFilter, priorityFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const selectedAssignee = storeUsers.find((u) => u._id === formData.assignedTo);
      const assigneeStoreId = selectedAssignee?.storeId?._id || selectedAssignee?.storeId;
      const targetStoreId = activeStoreId || user?.storeId || assigneeStoreId || undefined;

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          storeId: targetStoreId || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setFormData({ title: '', description: '', priority: 'Medium', dueDate: '', assignedTo: '' });
        loadTasks();
      } else {
        setError(json.error || 'Failed to create task');
      }
    } catch {
      setError('Communication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
        );
        if (selectedTask?._id === taskId) {
          setSelectedTask({ ...selectedTask, status: newStatus });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    try {
      const res = await fetch(`/api/tasks/${selectedTask._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText }),
      });
      const json = await res.json();
      if (json.success) {
        setCommentText('');
        setSelectedTask(json.data.task);
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getPriorityVariant = (priority: string) => {
    if (priority === 'Urgent') return 'error';
    if (priority === 'High') return 'warning';
    if (priority === 'Medium') return 'info';
    return 'neutral';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description="Operational task tracking, team assignments, due-date enforcement, and progress comments."
        actions={
          (user?.role === 'Admin' || user?.role === 'Store Manager') && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowCreateModal(true)}
            >
              New Task
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs text-[#20242C] bg-slate-50 border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs text-[#20242C] bg-slate-50 border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Task Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#737B89]">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-5 h-5 text-slate-400" />}
            title="No tasks found"
            description="All operational tasks have been completed or match no filter."
            action={
              (user?.role === 'Admin' || user?.role === 'Store Manager') ? (
                <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(true)}>
                  Create First Task
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-2.5">Task Title</th>
                  <th className="px-5 py-2.5">Assignee</th>
                  <th className="px-5 py-2.5">Priority</th>
                  <th className="px-5 py-2.5">Due Date</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {tasks.map((t) => {
                  const isOverdue =
                    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed';

                  return (
                    <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#20242C]">{t.title}</p>
                        {t.description && (
                          <p className="text-[11px] text-[#737B89] line-clamp-1 mt-0.5">{t.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#20242C]">
                        {t.assignedTo?.name || 'Unassigned'}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={getPriorityVariant(t.priority)} size="sm">
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <span className={isOverdue ? 'text-rose-600 font-medium' : 'text-[#737B89]'}>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t._id, e.target.value)}
                          className="text-xs bg-slate-50 border border-[#E5E7EB] rounded px-2 py-1 text-[#20242C] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => setSelectedTask(t)}
                        >
                          Details ({t.comments?.length || 0})
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Task"
        description="Assign action items with priority and due date."
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#20242C] mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Conduct monthly physical inventory count"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Details and expected deliverables..."
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Assignee *</label>
            <select
              required
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option value="">Select Assignee</option>
              {storeUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role}{u.storeId?.name ? ` • ${u.storeId.name}` : ''})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1"
              loading={submitting}
            >
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* TASK DETAILS & COMMENTS MODAL */}
      {selectedTask && (
        <Modal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          title={selectedTask.title}
          description={`Assigned to ${selectedTask.assignedTo?.name || 'Unassigned'}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-md bg-slate-50 border border-[#E5E7EB] space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[#737B89]">Description</span>
              <p className="text-[#20242C] leading-relaxed">
                {selectedTask.description || 'No detailed instructions provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#737B89]">Priority</span>
                <div className="mt-1">
                  <Badge variant={getPriorityVariant(selectedTask.priority)} size="sm">
                    {selectedTask.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#737B89]">Due Date</span>
                <p className="font-medium text-[#20242C] mt-1">
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'None set'}
                </p>
              </div>
            </div>

            {/* Comments List */}
            <div>
              <span className="block font-medium text-[#20242C] mb-1">
                Progress Notes & Comments ({selectedTask.comments?.length || 0})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1 mb-2">
                {selectedTask.comments && selectedTask.comments.length > 0 ? (
                  selectedTask.comments.map((c: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-md bg-slate-50 border border-[#E5E7EB]">
                      <div className="flex items-center justify-between text-[10px] text-[#737B89] mb-1">
                        <span className="font-medium text-[#20242C]">{c.userName || 'Staff'}</span>
                        <span className="font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[#20242C] text-[11px]">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[#737B89] text-[11px] italic">No comments yet.</p>
                )}
              </div>

              {/* Add Comment Box */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a progress update..."
                  className="flex-1 px-3 py-1.5 rounded-md border border-[#E5E7EB] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                />
                <Button type="submit" variant="primary" size="sm">
                  Comment
                </Button>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
