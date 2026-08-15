"use client";

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';

export default function DeleteConfirmModal({ isOpen, onClose, customer, onCustomerDeleted }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete customer');
      }

      onCustomerDeleted(customer.id);
      onClose();
      toast.success('Customer deleted successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to delete customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Customer</h3>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Trash2 size={28} />
              </div>
            </div>

            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-900">Delete customer?</h4>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete <span className="font-semibold text-gray-700">{customer?.company_name || customer?.first_name || 'this customer'}</span>?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={loading} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
