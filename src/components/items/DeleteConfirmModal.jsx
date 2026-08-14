"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import {toast} from "react-toastify";

export default function DeleteConfirmModal({ isOpen, onClose, item, onItemDeleted }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        onItemDeleted(item.id);
        onClose();
        toast.success('Item deleted successfully!');
      } else {
        toast.error(result.message || 'Failed to delete item');
      }
    } catch (error) {
      toast.error('Error deleting item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Item</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <Trash2 size={32} className="text-red-500" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Delete Item?</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete <span className="font-semibold text-gray-700">"{item?.name}"</span>?
                  <br />
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-sm bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}