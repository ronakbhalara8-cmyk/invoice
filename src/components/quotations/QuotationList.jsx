'use client';

import { Download, Edit3, RefreshCcw, Trash2 } from 'lucide-react';

const formatAmount = (value) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

export default function QuotationList({
    quotations,
    loading,
    onRefresh,
    onEdit,
    onDelete,
    onDownload,
}) {
    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                Loading quotations...
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white font-sans">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-lg font-bold text-slate-900">Quotation List</h3>
                <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-5 py-4 font-semibold">Quotation Number</th>
                            <th className="px-5 py-4 font-semibold">Customer</th>
                            <th className="px-5 py-4 font-semibold">Date</th>
                            <th className="px-5 py-4 font-semibold">Amount</th>
                            <th className="px-5 py-4 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!quotations.length ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                                    No quotations created yet.
                                </td>
                            </tr>
                        ) : (
                            quotations.map((quotation) => (
                                <tr key={quotation.id} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="px-5 py-4 font-semibold text-slate-900">
                                        {quotation.quotation_number}
                                    </td>
                                    <td className="px-5 py-4 text-slate-700">{quotation.customer_name}</td>
                                    <td className="px-5 py-4 text-slate-700">
                                        {new Date(quotation.created_at).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="px-5 py-4 font-semibold text-slate-900">
                                        {quotation.currency || 'INR'} {formatAmount(quotation.grand_total)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onDownload(quotation)}
                                                title="Download PDF"
                                                className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-500"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onEdit(quotation)}
                                                title="Edit quotation"
                                                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(quotation)}
                                                title="Delete quotation"
                                                className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}