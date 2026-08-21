'use client';

import { useEffect, useState } from 'react';
import { Banknote, CircleDollarSign, CreditCard, Download, History, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { downloadReceivablePdf } from '@/components/payments/ReceivablePDF';

const paymentMethods = [
    ['CASH', 'Cash'],
    ['BANK_TRANSFER', 'Bank transfer'],
    ['UPI', 'UPI'],
    ['CARD', 'Card'],
    ['CHEQUE', 'Cheque'],
    ['OTHER', 'Other'],
];

const formatCurrency = (value, currency = 'INR') => {
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0);
    } catch {
        return `${currency} ${Number(value) || 0}`;
    }
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '-';

const getLocalDateKey = (value) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getToday = () => getLocalDateKey();

const statusLabels = {
    UNPAID: 'Unpaid',
    OVERDUE: 'Overdue',
    PAID: 'Paid',
    PARTIALLY_PAID: 'Partially Paid',
};

const paymentMethodLabels = {
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank Transfer',
    UPI: 'UPI',
    CARD: 'Card',
    CHEQUE: 'Cheque',
    OTHER: 'Other',
};

export default function PaymentsPage() {
    const [activeTab, setActiveTab] = useState('outstanding');
    const [searchTerm, setSearchTerm] = useState('');
    const [receivables, setReceivables] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [historyInvoice, setHistoryInvoice] = useState(null);
    const [history, setHistory] = useState([]);
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
    const [form, setForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: 'BANK_TRANSFER', referenceNumber: '', notes: '' });

    const loadData = async () => {
        try {
            setLoading(true);
            const [receivablesResponse, paymentsResponse] = await Promise.all([
                fetch('/api/payments?view=receivables'),
                fetch('/api/payments'),
            ]);
            const receivablesResult = await receivablesResponse.json();
            const paymentsResult = await paymentsResponse.json();
            setReceivables(receivablesResult?.success ? receivablesResult.data || [] : []);
            setPayments(paymentsResult?.success ? paymentsResult.data || [] : []);
        } catch (error) {
            console.error('Failed to load payments:', error);
            toast.error('Unable to load payment data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const openPayment = (invoice) => {
        setSelectedInvoice(invoice);
        setForm((current) => ({ ...current, amount: Number(invoice.balance_due || 0).toFixed(2) }));
    };

    const openHistory = async (invoice) => {
        setHistoryInvoice(invoice);
        try {
            const response = await fetch(`/api/payments?invoiceId=${invoice.invoice_id}`);
            const result = await response.json();
            setHistory(result?.success ? result.data || [] : []);
        } catch {
            toast.error('Unable to load payment history.');
        }
    };

    const downloadReceivable = async (invoice) => {
        try {
            const response = await fetch(`/api/payments?invoiceId=${invoice.invoice_id}`);
            const result = await response.json();
            if (!response.ok || !result?.success) throw new Error('Unable to load payment history');
            downloadReceivablePdf(invoice, result.data || []);
        } catch (error) {
            toast.error(error.message || 'Unable to generate receivable PDF.');
        }
    };

    const submitPayment = async (event) => {
        event.preventDefault();
        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId: selectedInvoice.invoice_id, ...form, amount: Number(form.amount) }),
            });
            const result = await response.json();
            if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to record payment');
            toast.success('Payment recorded successfully.');
            setSelectedInvoice(null);
            await loadData();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const Status = (status) => {
        switch (status) {
            case 'UNPAID':
                return <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">Unpaid</span>;
            case 'OVERDUE':
                return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Overdue</span>;
            case 'PAID':
                return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Paid</span>;
            case 'PARTIALLY_PAID':
                return <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700">Partially Paid</span>;
            default:
                return <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{statusLabels[status] || status}</span>;
        }
    }

    const formatPaymentMethod = (method) => {
        switch (method) {
            case 'CASH':
                return <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">Cash</span>;
            case 'BANK_TRANSFER':
                return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Bank Transfer</span>;
            case 'UPI':
                return <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">UPI</span>;
            case 'CARD':
                return <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">Card</span>;
            case 'CHEQUE':
                return <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700">Cheque</span>;
            case 'OTHER':
                return <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">Other</span>;
            default:
                return <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{paymentMethodLabels[method] || method}</span>;
        }
    };

    const outstanding = receivables.reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
    const overdue = receivables.filter((invoice) => invoice.payment_status === 'OVERDUE').reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
    const received = payments.filter((payment) => payment.payment_status === 'ACTIVE').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const todaysPayments = payments.filter((payment) => payment.payment_status === 'ACTIVE' && getLocalDateKey(payment.created_at) === getToday());
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const visibleReceivables = [...receivables]
        .filter((invoice) => invoiceStatusFilter === 'ALL' || invoice.payment_status === invoiceStatusFilter)
        .filter((invoice) => !normalizedSearch || `${invoice.invoice_number} ${invoice.customer_name}`.toLowerCase().includes(normalizedSearch))
        .sort((first, second) => {
            const firstOverdue = first.payment_status === 'OVERDUE' ? 0 : 1;
            const secondOverdue = second.payment_status === 'OVERDUE' ? 0 : 1;
            if (firstOverdue !== secondOverdue) return firstOverdue - secondOverdue;
            return String(first.due_date || '').localeCompare(String(second.due_date || ''));
        });
    const visibleTodaysPayments = todaysPayments.filter((payment) =>
        (paymentMethodFilter === 'ALL' || payment.payment_method === paymentMethodFilter) &&
        (!normalizedSearch || `${payment.payment_number} ${payment.customer_name} ${payment.payment_method}`.toLowerCase().includes(normalizedSearch))
    );

    return (
        <main className="mx-auto w-full font-sans space-y-6 pb-8">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments & Receivables</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage your payments and receivables efficiently</p>
                </div>
                <button
                    type="button"
                    onClick={loadData}
                    aria-label="Refresh payments"
                    title="Refresh payments"
                    className="self-start rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:border-emerald-200 hover:text-emerald-600"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <section className="grid gap-4 sm:grid-cols-3">
                {[
                    ['Outstanding', outstanding, 'text-orange-700', 'bg-orange-50'],
                    ['Overdue', overdue, 'text-rose-700', 'bg-rose-50'],
                    ['Received', received, 'text-emerald-700', 'bg-emerald-50']
                ].map(([label, value, color, background]) => (
                    <article
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${background} ${color}`}>
                            <CircleDollarSign className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                            {formatCurrency(value)}
                        </p>
                    </article>
                ))}
            </section>

            <div className="flex flex-col gap-3 sm:flex-row justify-between sm:items-center">
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-fit">
                    {[
                        ['outstanding', 'Outstanding'],
                        ['recent', 'Recent payments (Today)'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setActiveTab(value)}
                            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${activeTab === value
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 shadow-sm sm:max-w-sm">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="sr-only">Search payments</span>
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={activeTab === 'outstanding' ? 'Search invoice or customer' : 'Search payment or customer'}
                        className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                    />
                </label>
            </div>

            {activeTab === 'outstanding' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900">Outstanding invoices</h2>
                        <p className="mt-1 text-xs text-slate-400">
                            Record collections and follow up on balances.
                        </p>
                    </div>
                    <select
                        value={invoiceStatusFilter}
                        onChange={(event) => setInvoiceStatusFilter(event.target.value)}
                        aria-label="Filter invoices by payment status"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                    >
                        <option value="ALL">All payment statuses</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-5 py-3">Invoice</th>
                                <th className="px-5 py-3">Customer</th>
                                <th className="px-5 py-3">Due date</th>
                                <th className="px-5 py-3">Total</th>
                                <th className="px-5 py-3">Balance</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleReceivables.length ? (
                                visibleReceivables.map((invoice) => (
                                    <tr key={invoice.invoice_id} className="border-t border-slate-100">
                                        <td className="px-5 py-4 font-semibold text-slate-900">
                                            {invoice.invoice_number}
                                        </td>
                                        <td className="px-5 py-4 text-slate-700">
                                            {invoice.customer_name}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {formatDate(invoice.due_date)}
                                        </td>
                                        <td className="px-5 py-4 text-slate-700">
                                            {formatCurrency(invoice.grand_total)}
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-slate-900">
                                            {formatCurrency(invoice.balance_due)}
                                        </td>
                                        <td className="px-5 py-4">
                                            {Status(invoice?.payment_status)}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <span className="group relative z-20 inline-flex hover:z-20">
                                                    <button
                                                        type="button"
                                                        onClick={() => openHistory(invoice)}
                                                        aria-label={`View payment history for ${invoice.invoice_number}`}
                                                        title="View payment history"
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-300 border border-slate-200 text-black"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </button>
                                                    <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 left-auto z-20 mb-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                                        View payment history
                                                    </span>
                                                </span>
                                                {invoice?.payment_status != 'PAID' && (
                                                    <span className="group relative z-20 inline-flex hover:z-20">
                                                        <button
                                                            type="button"
                                                            onClick={() => openPayment(invoice)}
                                                            aria-label={`Record payment for ${invoice.invoice_number}`}
                                                            title="Record payment"
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"
                                                        >
                                                            <CreditCard className="h-4 w-4" />
                                                        </button>
                                                        <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 left-auto z-20 mb-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                                            Record payment
                                                        </span>
                                                    </span>
                                                )}
                                                <span className="group relative z-20 inline-flex hover:z-20">
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadReceivable(invoice)}
                                                        aria-label={`Download receivable PDF for ${invoice.invoice_number}`}
                                                        title="Download receivable PDF"
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 border border-slate-200 text-white "
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </button>
                                                    <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 left-auto z-20 mb-2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                                        Download receivable PDF
                                                    </span>
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                                        {invoiceStatusFilter !== 'ALL' || normalizedSearch ? 'No matching invoices found.' : 'No outstanding invoices.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>}

            {activeTab === 'recent' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900">Recent payments</h2>
                        <p className="mt-1 text-xs text-slate-400">
                            Today&apos;s payment entries.
                        </p>
                    </div>
                    <select
                        value={paymentMethodFilter}
                        onChange={(event) => setPaymentMethodFilter(event.target.value)}
                        aria-label="Filter payments by method"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                    >
                        <option value="ALL">All payment methods</option>
                        {paymentMethods.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-5 py-3">Payment</th>
                                <th className="px-5 py-3">Customer Name</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Method</th>
                                <th className="px-5 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleTodaysPayments.slice(0, 20).map((payment) => (
                                <tr key={payment.id} className="border-t border-slate-100">
                                    <td className="px-5 py-4 font-semibold text-slate-900">
                                        {payment.payment_number}
                                    </td>
                                    <td className="px-5 py-4 text-slate-700">
                                        {payment.customer_name}
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">
                                        {formatDate(payment.payment_date)}
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">
                                        {formatPaymentMethod(payment.payment_method)}
                                    </td>
                                    <td className="px-5 py-4 text-right font-semibold text-emerald-700">
                                        {formatCurrency(payment.amount)}
                                    </td>
                                </tr>
                            ))}
                            {!visibleTodaysPayments.length && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                                        {paymentMethodFilter !== 'ALL' || normalizedSearch ? 'No matching payments found.' : 'No payments recorded today.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>}

            {selectedInvoice && (
                <div onClick={() => setSelectedInvoice(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <form onSubmit={submitPayment} onClick={(event) => event.stopPropagation()} className="my-8 w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Record payment</h2>
                                <p className="text-sm text-slate-500">
                                    {selectedInvoice.invoice_number} · balance {formatCurrency(selectedInvoice.balance_due)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedInvoice(null)}
                                aria-label="Close payment form"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <label className="block text-sm font-medium text-slate-700">
                            Amount
                            <input
                                required
                                min="0.01"
                                max={selectedInvoice.balance_due}
                                step="0.01"
                                type="number"
                                value={form.amount}
                                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                            />
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Payment date
                                <input
                                    required
                                    max={getToday()}
                                    type="date"
                                    value={form.paymentDate}
                                    onChange={(event) => setForm({ ...form, paymentDate: event.target.value })}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                                />
                            </label>
                            <label className="block text-sm font-medium text-slate-700">
                                Method
                                <select
                                    value={form.paymentMethod}
                                    onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                                >
                                    {paymentMethods.map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label className="block text-sm font-medium text-slate-700">
                            Reference number
                            <input
                                value={form.referenceNumber}
                                onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                            />
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                            Notes
                            <textarea
                                value={form.notes}
                                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                                rows={3}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                            />
                        </label>

                        <div className="flex justify-between gap-5">
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                type="button"
                                className="rounded-lg cursor-pointer w-full px-4 py-3 font-semibold border border-slate-500 text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-lg w-full bg-blue-600 cursor-pointer px-4 py-3 font-semibold text-white hover:bg-blue-500"
                            >
                                Save payment
                            </button>
                        </div>
                    </form>
                </div >
            )
            }

            {
                historyInvoice && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
                        onClick={() => setHistoryInvoice(null)}
                    >
                        <div
                            className="my-8 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex shrink-0 items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Payment history</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setHistoryInvoice(null)}
                                    aria-label="Close payment history "
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                >
                                    <X className="h-5 w-5 text-slate-500" />
                                </button>
                            </div>
                            <p className="text-sm mb-4 font-medium text-slate-500">{historyInvoice.invoice_number}</p>

                            {history.length ? (
                                <div className="min-h-0 overflow-y-auto divide-y divide-slate-100 pr-2">
                                    {history.map((payment) => (
                                        <div key={payment.id} className="flex items-center justify-between gap-4 py-3">
                                            <div>
                                                <p className="font-semibold text-slate-800">
                                                    {payment.payment_number} · {formatPaymentMethod(payment.payment_method)}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {formatDate(payment.payment_date)}
                                                </p>
                                            </div>
                                            <p className="shrink-0 font-bold text-slate-900">
                                                {formatCurrency(payment.amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-8 text-center text-slate-500">
                                    No payments recorded for this invoice.
                                </p>
                            )}
                        </div>
                    </div>
                )
            }
        </main >
    );
}
