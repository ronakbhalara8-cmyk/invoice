"use client";

import { EyeClosed, EyeIcon, EyeOff, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

const EMPTY_FORM = {
  companyName: '',
  organizationName: '',
  phone: '',
  gstNumber: '',
  password: '',
};

export default function ProfileEditModal({ user, onClose, onUserUpdate }) {
  const router = useRouter();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const nextForm = {
      companyName: user?.companyName || user?.company_name || user?.organizationName || user?.name || '',
      organizationName: user?.organizationName || user?.companyName || user?.company_name || user?.name || '',
      phone: user?.phone || '',
      gstNumber: user?.gstNumber || '',
      password: '',
    };
    setFormData(nextForm);
    setErrors({});
  }, [user]);

  const sanitizePhoneValue = (value = '') => value.replace(/\D/g, '').slice(0, 10);

  const isValidPhoneNumber = (value = '') => {
    const digits = sanitizePhoneValue(value);
    return digits.length === 10 && /^[6-9]/.test(digits);
  };

  const isValidGSTNumber = (value = '') => {
    const gst = String(value || '').trim().toUpperCase();
    if (!gst) return true;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z{1}[0-9A-Z]{1}$/.test(gst);
  };

  const handleChange = (key, value) => {
    if (key === 'phone') {
      value = sanitizePhoneValue(value);
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }

    if (formData.phone.trim()) {
      if (!isValidPhoneNumber(formData.phone)) {
        newErrors.phone = 'Phone must be 10 digits starting with 6, 7, 8, or 9';
      }
    }

    if (formData.gstNumber.trim()) {
      if (!isValidGSTNumber(formData.gstNumber)) {
        newErrors.gstNumber = 'Invalid GST number format (e.g., 27ABCDE1234F1Z5)';
      }
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all validation errors.');
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

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/organizations');
              }}
              className="font-sans cursor-pointer text-blue-600 hover:text-blue-700"
            >
              Manage <Settings className="inline-block h-4 w-4" />
            </button>
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
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Company name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(event) => handleChange('companyName', event.target.value)}
                  className={`w-full rounded-xl border ${errors.companyName ? 'border-red-500' : 'border-slate-200'} bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white`}
                />
                {errors.companyName && (
                  <p className="mt-1 text-xs text-red-500">{errors.companyName}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Organization name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(event) => handleChange('organizationName', event.target.value)}
                  className={`w-full rounded-xl border ${errors.organizationName ? 'border-red-500' : 'border-slate-200'} bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white`}
                />
                {errors.organizationName && (
                  <p className="mt-1 text-xs text-red-500">{errors.organizationName}</p>
                )}
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
                  inputMode="numeric"
                  value={formData.phone}
                  onChange={(event) => handleChange('phone', event.target.value)}
                  className={`w-full rounded-xl border ${errors.phone ? 'border-red-500' : 'border-slate-200'} bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white`}
                  placeholder="10 digits phone number"
                  maxLength={10}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">GST Number</label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(event) => handleChange('gstNumber', event.target.value.toUpperCase())}
                  placeholder="27ABCDE1234F1Z5"
                  className={`w-full rounded-xl border ${errors.gstNumber ? 'border-red-500' : 'border-slate-200'} bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white`}
                />
                {errors.gstNumber && (
                  <p className="mt-1 text-xs text-red-500">{errors.gstNumber}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(event) => handleChange('password', event.target.value)}
                    placeholder="Leave blank to keep current password"
                    className={`w-full rounded-xl border ${errors.password ? 'border-red-500' : 'border-slate-200'} bg-slate-50 px-3 py-2.5 pr-11 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-500 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff /> : <EyeIcon />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                )}
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