'use client';

import { Download, FileText, RefreshCcw } from 'lucide-react';

const normalizeCurrency = (value) => (value ? String(value).trim().toUpperCase() : 'INR');

const displayCurrency = (value, currency = 'INR') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: normalizeCurrency(currency),
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export default function InvoiceList({ invoices, loading, onRefresh, onDownload }) {
  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-500">
        Loading invoices...
      </div>
    );
  }

  return (
    <div className="rounded-xl font-sans border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-lg font-bold text-slate-900">Invoice List</h3>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold">Invoice Number</th>
              <th className="px-5 py-4 font-semibold">Customer Name</th>
              <th className="px-5 py-4 font-semibold">Date</th>
              <th className="px-5 py-4 font-semibold">Amount</th>
              <th className="px-5 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  No invoices generated yet.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const invoiceCurrency = normalizeCurrency(invoice?.company_info?.currency || invoice?.currency || 'INR');

                return (
                  <tr key={invoice.id} className="border-t border-slate-200 transition hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">{invoice.invoice_number}</td>
                    <td className="px-5 py-4 text-slate-700">{invoice.customer_name}</td>
                    <td className="px-5 py-4 text-slate-700">{new Date(invoice.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{displayCurrency(invoice.grand_total, invoiceCurrency)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDownload(invoice)}
                        className="inline-flex h-10 w-10 items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
