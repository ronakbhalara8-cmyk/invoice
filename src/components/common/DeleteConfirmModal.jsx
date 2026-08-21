'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';

export default function DeleteConfirmModal({
    isOpen,
    item,
    apiPath,
    resourceLabel = 'record',
    resourceName,
    onClose,
    onDeleted,
}) {
    const [loading, setLoading] = useState(false);

    if (!isOpen || !item) return null;

    const displayName = resourceName || item.name || item.quotation_number || item.company_name || item.customer_name || 'this record';

    const handleDelete = async () => {
        try {
            setLoading(true);
            const response = await fetch(apiPath, { method: 'DELETE' });
            const result = await response.json();

            if (!response.ok || !result?.success) {
                throw new Error(result?.message || `Failed to delete ${resourceLabel}`);
            }

            onDeleted(item.id);
            onClose();
            toast.success(`${resourceLabel.charAt(0).toUpperCase()}${resourceLabel.slice(1)} deleted successfully.`);
        } catch (error) {
            console.error(`Delete ${resourceLabel} error:`, error);
            toast.error(error.message || `Failed to delete ${resourceLabel}.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 font-sans overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <button
                    type="button"
                    aria-label="Close delete confirmation"
                    onClick={onClose}
                    className="fixed inset-0 cursor-default bg-black/50 backdrop-blur-sm"
                />
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-confirmation-title"
                    className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
                >
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <h3 id="delete-confirmation-title" className="text-lg font-semibold text-slate-900">
                            Delete {resourceLabel}
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            aria-label="Close"
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-5 px-6 py-6">
                        <div className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                                <Trash2 className="h-7 w-7" />
                            </div>
                            <h4 className="mt-4 text-lg font-semibold text-slate-900">
                                Delete {resourceLabel}?
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Are you sure you want to delete{' '}
                                <span className="font-semibold text-slate-700">{displayName}</span>?
                                <br />
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
