"use client";

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

const EMPTY_FORM = {
  companyName: '',
  organizationName: '',
  phone: '',
  gstNumber: '',
  password: '',
};

export default function ProfileEditModal({ user, onClose, onUserUpdate }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const nextForm = {
      companyName: user?.companyName || user?.company_name || user?.organizationName || user?.name || '',
      organizationName: user?.organizationName || user?.companyName || user?.company_name || user?.name || '',
      phone: user?.phone || '',
      gstNumber: user?.gstNumber || '',
      password: '',
    };
    setFormData(nextForm);
  }, [user]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.companyName.trim()) {
      toast.error('Company name is required.');
      return;
    }

    if (!formData.organizationName.trim()) {
      toast.error('Organization name is required.');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setSaving(true);

    try {
      const trimmedPhone = (formData.phone || '').trim();

      const payload = {
        companyName: formData.companyName,
        organizationName: formData.organizationName,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        gstNumber: formData.gstNumber,
        ...(formData.password ? { password: formData.password } : {}),
      };

      const response = await fetch('/api/auth/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.message || 'Failed to update profile.');
      }

      const updatedUser = {
        ...user,
        id: result.data.userId ?? user?.id,
        email: user?.email || '',
        name: result.data.companyName || formData.companyName,
        company_name: result.data.companyName || formData.companyName,
        companyName: result.data.companyName || formData.companyName,
        organizationName: result.data.organizationName || formData.organizationName,
        phone: result.data.phone || formData.phone,
        gstNumber: result.data.gstNumber || formData.gstNumber,
        organizationId: result.data.organizationId ?? user?.organizationId,
      };

      onUserUpdate?.(updatedUser);
      toast.success('Profile updated successfully.');
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/25 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-[-12px_0_30px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
              {((user?.organizationName || user?.company_name || user?.name || 'U')?.charAt(0) || 'U').toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Profile</p>
              <h3 className="text-2xl font-bold text-slate-800">Edit profile</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            aria-label="Close"
          >
            <span>✕</span>
            <span>Close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Company name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(event) => handleChange('companyName', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Organization name</label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(event) => handleChange('organizationName', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => handleChange('phone', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">GST Number</label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(event) => handleChange('gstNumber', event.target.value)}
                  placeholder="Enter GST number"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(event) => handleChange('password', event.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-500 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
