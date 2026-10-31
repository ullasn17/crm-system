'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  UserCog,
  Search,
  Plus,
  Shield,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function UsersPage() {
  const { user, activeStoreId } = useAuth();

  const [usersList, setUsersList] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Staff',
    storeId: '',
    phone: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Staff',
    storeId: '',
    phone: '',
    isActive: true,
  });

  const handleOpenEdit = (targetUser: any) => {
    setEditingUser(targetUser);
    setEditFormData({
      name: targetUser.name || '',
      email: targetUser.email || '',
      password: '',
      role: targetUser.role || 'Staff',
      storeId: targetUser.storeId?._id || targetUser.storeId || '',
      phone: targetUser.phone || '',
      isActive: targetUser.isActive ?? true,
    });
    setError('');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSubmitting(true);

    try {
      const payload: any = {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        storeId: editFormData.storeId || null,
        phone: editFormData.phone,
        isActive: editFormData.isActive,
      };
      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const res = await fetch(`/api/users/${editingUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setShowEditModal(false);
        setEditingUser(null);
        setSuccess(`User "${editFormData.name}" updated successfully.`);
        loadUsers();
      } else {
        setError(json.error || 'Failed to update user');
      }
    } catch {
      setError('Communication error updating user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${userToDelete._id}?permanent=true`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Employee "${userToDelete.name}" permanently deleted.`);
        setShowDeleteModal(false);
        setUserToDelete(null);
        loadUsers();
      } else {
        setError(json.error || 'Failed to delete employee account');
      }
    } catch {
      setError('Communication error while deleting employee account');
    } finally {
      setDeleting(false);
    }
  };

  const loadUsers = () => {
    setLoading(true);
    let url = '/api/users?';
    if (activeStoreId) url += `storeId=${activeStoreId}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (roleFilter) url += `role=${roleFilter}&`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setUsersList(json.data.users || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadStores = () => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStores(json.data.stores || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadUsers();
    loadStores();
  }, [activeStoreId, search, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          storeId: user?.role === 'Store Manager' ? user.storeId : formData.storeId || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setFormData({ name: '', email: '', password: '', role: 'Staff', storeId: '', phone: '' });
        setSuccess('Employee user account created successfully.');
        loadUsers();
      } else {
        setError(json.error || 'Failed to create user');
      }
    } catch {
      setError('Communication error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (targetUser: any) => {
    setError('');
    try {
      const res = await fetch(`/api/users/${targetUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !targetUser.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        loadUsers();
      } else {
        setError(json.error || 'Failed to update user status');
      }
    } catch {
      setError('Network communication failed');
    }
  };

  const getRoleVariant = (role: string) => {
    if (role === 'Admin') return 'indigo';
    if (role === 'Store Manager') return 'info';
    if (role === 'Staff') return 'success';
    if (role === 'Counter') return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users & Access"
        description="Corporate staff directory, Role-Based Access Control (RBAC) tiers, and branch alignment."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setShowCreateModal(true);
              setError('');
            }}
          >
            Add Employee
          </Button>
        }
      />

      {success && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-slate-50 border border-[#E5E7EB] text-xs text-[#20242C] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:bg-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs text-[#20242C] bg-slate-50 border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Store Manager">Store Manager</option>
          <option value="Staff">Staff</option>
          <option value="Counter">Counter</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#737B89]">Loading team members...</div>
        ) : usersList.length === 0 ? (
          <EmptyState
            icon={<UserCog className="w-5 h-5 text-slate-400" />}
            title="No users found"
            description="No employee accounts match your search filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-2.5">Employee</th>
                  <th className="px-5 py-2.5">Role Tier</th>
                  <th className="px-5 py-2.5">Store Branch</th>
                  <th className="px-5 py-2.5">Contact Phone</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#20242C]">{u.name}</p>
                      <p className="text-[11px] text-[#737B89]">{u.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={getRoleVariant(u.role)} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-[#20242C]">
                      {u.storeId?.name || (u.role === 'Admin' ? 'Consolidated All Stores' : 'Unassigned')}
                    </td>
                    <td className="px-5 py-3 font-mono text-[#737B89] text-[11px]">
                      {u.phone || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={u.isActive ? 'success' : 'error'} size="sm" dot>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenEdit(u)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant={u.isActive ? 'secondary' : 'primary'}
                          size="xs"
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        {user?.role === 'Admin' && u._id !== user?.userId && (
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => {
                              setUserToDelete(u);
                              setShowDeleteModal(true);
                            }}
                            title="Permanently Delete Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Employee User"
        description="Create account credentials, role authorization, and branch store assignment."
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#20242C] mb-1">Employee Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Rahul Sen"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Work Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="rahul@crmsystem.local"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Initial Password (min 8 chars) *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Role Designation *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                {user?.role === 'Admin' && <option value="Admin">Admin (Global)</option>}
                {user?.role === 'Admin' && <option value="Store Manager">Store Manager</option>}
                <option value="Staff">Staff (CRM & Leads)</option>
                <option value="Counter">Counter (Cashier POS)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#20242C] mb-1">Store Branch</label>
              <select
                disabled={user?.role === 'Store Manager'}
                value={user?.role === 'Store Manager' ? (user.storeId || '') : formData.storeId}
                onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:bg-slate-100"
              >
                <option value="">Select Branch...</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Phone Number (Optional)</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98000 00000"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
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
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER & ROLE / RESET PASSWORD MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Employee: ${editingUser?.name || ''}`}
        description="Update profile details, assign RBAC role tier, switch store branch, or reset login password."
        maxWidth="md"
      >
        <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#20242C] mb-1">Employee Full Name *</label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Work Email Address *</label>
            <input
              type="email"
              required
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">
              Reset Password (Optional)
            </label>
            <input
              type="password"
              value={editFormData.password}
              onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
              placeholder="Leave blank to keep current password, or enter 8+ chars"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
            <p className="text-[11px] text-[#737B89] mt-0.5">
              Only enter a value here if you want to reset this user's password.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Role Authorization Tier *</label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="Admin">Admin (Executive All Stores)</option>
                <option value="Store Manager">Store Manager (Branch Operations)</option>
                <option value="Staff">Staff (Sales & Customers)</option>
                <option value="Counter">Counter (POS Cashier Only)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#20242C] mb-1">Assigned Store Branch</label>
              <select
                value={editFormData.storeId}
                onChange={(e) => setEditFormData({ ...editFormData, storeId: e.target.value })}
                disabled={editFormData.role === 'Admin'}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:bg-slate-100 disabled:text-slate-400"
              >
                {editFormData.role === 'Admin' ? (
                  <option value="">Consolidated All Stores</option>
                ) : (
                  <>
                    <option value="">Select branch...</option>
                    {stores.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Contact Phone</label>
            <input
              type="text"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              placeholder="+91 98000 00000"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="editIsActive"
              checked={editFormData.isActive}
              onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
              className="rounded border-[#E5E7EB] text-[#4F46E5] focus:ring-0 w-3.5 h-3.5"
            />
            <label htmlFor="editIsActive" className="text-xs text-[#20242C] font-medium cursor-pointer">
              Account Active (User can log in to their assigned portal)
            </label>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowEditModal(false)}
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
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL (ADMIN ONLY) */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleting) {
            setShowDeleteModal(false);
            setUserToDelete(null);
          }
        }}
        title="Permanently Delete Employee Account"
        description="Are you sure you want to delete this employee? All access credentials will be permanently erased."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
            <p className="font-semibold text-rose-900 mb-1">Warning: Irreversible Action</p>
            <p>
              You are about to permanently remove{' '}
              <strong>{userToDelete?.name}</strong> ({userToDelete?.email}) with role{' '}
              <span className="font-semibold">{userToDelete?.role}</span>.
            </p>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={deleting}
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="flex-1"
              loading={deleting}
              onClick={handleConfirmDelete}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
