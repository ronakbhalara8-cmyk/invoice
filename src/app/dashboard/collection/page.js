'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Edit3, History, MessageCircle, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';
import React from 'react';

const statuses = [
    ['PENDING', 'Pending'],
    ['CONTACTED', 'Contacted'],
    ['PROMISE_TO_PAY', 'Promise to Pay'],
    ['COLLECTED', 'Collected'],
];

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '-';
const statusLabel = (value) => statuses.find(([key]) => key === value)?.[1] || value;
const statusChipClass = (value) => ({
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
    CONTACTED: 'bg-blue-50 text-blue-700 ring-blue-200',
    PROMISE_TO_PAY: 'bg-violet-50 text-violet-700 ring-violet-200',
    COLLECTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}[value] || 'bg-slate-50 text-slate-700 ring-slate-200');
const localDate = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const dateInputValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : null;
const whatsappNumberValue = (value) => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length === 10) return `91${digits}`;
    return '';
};

export default function CollectionsPage() {
    const [rows, setRows] = useState([]);
    const [history, setHistory] = useState([]);
    const [historyInvoice, setHistoryInvoice] = useState(null);
    const [editingRow, setEditingRow] = useState(null);
    const [editForm, setEditForm] = useState({ status: 'PENDING', nextFollowupDate: '', notes: '' });
    const [search, setSearch] = useState('');
    const [sender, setSender] = useState({ organizationName: '', username: '', phone: '', email: '' });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(null);

    const loadCollections = async () => {
        try {
            setLoading(true);
            setLoadError('');
            const response = await fetch('/api/collections', { cache: 'no-store' });
            const result = await response.json();
            if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to load collections');
            setRows(result.data || []);
        } catch (error) {
            setLoadError(error.message || 'Unable to load collections');
            setRows([]);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCollections();
        const loadSender = async () => {
            try {
                const response = await fetch('/api/auth/user', { cache: 'no-store' });
                const result = await response.json();
                if (response.ok && !result?.error) {
                    setSender({
                        organizationName: result.data?.organizationName || result.data?.companyName || '',
                        username: result.data?.username || '',
                        phone: result.data?.phone || '',
                        email: result.data?.email || '',
                    });
                }
            } catch (error) {
                console.error('Failed to load sender details:', error);
            }
        };
        loadSender();
    }, []);

    const updateFollowup = async (row, status, notes = row.notes || '', nextFollowupDate = dateInputValue(row.next_followup_date)) => {
        try {
            setSaving(row.invoice_id);
            const payload = { status, notes, nextFollowupDate };
            const response = row.followup_id
                ? await fetch('/api/collections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, followupId: row.followup_id }) })
                : await fetch('/api/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, invoiceId: row.invoice_id }) });
            const result = await response.json();
            if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to save follow-up');
            await loadCollections();
            toast.success('Follow-up updated.');
            return true;
        } catch (error) {
            toast.error(error.message);
            return false;
        } finally {
            setSaving(null);
        }
    };

    const saveNotes = async (row, event) => updateFollowup(row, row.followup_status, event.target.value);

    const Status = (status) => {
        switch (status) {
            case 'UNPAID':
                return <span className="text-xs font-semibold text-orange-700">Unpaid</span>;
            case 'OVERDUE':
                return <span className="text-xs font-semibold text-red-700">Overdue</span>;
            case 'PAID':
                return <span className="text-xs font-semibold text-emerald-700">Paid</span>;
            case 'PARTIALLY_PAID':
                return <span className="text-xs font-semibold text-yellow-700">Partially Paid</span>;
            default:
                return <span className="text-xs font-semibold text-slate-700">{statusLabels[status] || status}</span>;
        }
    }

    const openEditor = (row) => {
        setEditingRow(row);
        setEditForm({
            status: row.followup_status || 'PENDING',
            nextFollowupDate: dateInputValue(row.next_followup_date) || '',
            notes: row.notes || '',
        });
    };

    const saveEditor = async (event) => {
        event.preventDefault();
        if (!editingRow) return;
        const saved = await updateFollowup(editingRow, editForm.status, editForm.notes, editForm.nextFollowupDate || null);
        if (saved) setEditingRow(null);
    };

    const hasEditorChanges = editingRow && (
        editForm.status !== (editingRow.followup_status || 'PENDING')
        || editForm.nextFollowupDate !== (dateInputValue(editingRow.next_followup_date) || '')
        || editForm.notes !== (editingRow.notes || '')
    );

    const openHistory = async (row) => {
        setHistoryInvoice(row);
        try {
            const response = await fetch(`/api/collections?invoiceId=${row.invoice_id}`);
            const result = await response.json();
            if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to load follow-up history');
            setHistory(result.data || []);
        } catch (error) {
            setHistory([]);
            toast.error(error.message || 'Unable to load follow-up history');
        }
    };

    const sendWhatsApp = (row) => {
        const whatsappNumber = whatsappNumberValue(row.customer_phone);
        if (!whatsappNumber) {
            toast.error('Add a mobile number to this customer before using WhatsApp reminder.');
            return;
        }
        const senderName = sender.organizationName || sender.username || 'Our team';
        const senderDetails = [
            `From: ${senderName}`,
            sender.username && sender.username !== senderName ? `Contact person: ${sender.username}` : '',
            sender.phone ? `Phone: ${sender.phone}` : '',
            sender.email ? `Email: ${sender.email}` : '',
        ].filter(Boolean).join('\n');
        const message = `Hello ${row.customer_name},

This is a friendly payment reminder from our team.

Invoice: ${row.invoice_number}
Outstanding amount: ${money(row.balance_due)}
Due date: ${dateLabel(row.due_date)}

Please let us know once the payment has been made. If you have already paid, kindly share the payment details with us.

Thank you.

${senderDetails}`;
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    };

    const visibleRows = rows.filter((row) => `${row.invoice_number} ${row.customer_name}`.toLowerCase().includes(search.trim().toLowerCase()));
    const dueToday = rows.filter((row) => row.due_date === localDate()).length;
    const overdue = rows.filter((row) => row.payment_status === 'OVERDUE').length;
    const pending = rows.filter((row) => row.followup_status === 'PENDING').length;

    return (
        <main className="space-y-6 pb-8 font-sans">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Collections follow-up</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Track payment commitments and follow up on outstanding invoices.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        WhatsApp reminders are sent to the customer phone number.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadCollections}
                    aria-label="Refresh collections"
                    title="Refresh collections"
                    className="self-start rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:text-blue-600"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <section className="grid gap-4 sm:grid-cols-3">
                {[
                    ['Due today', dueToday, CalendarClock, 'text-blue-700', 'bg-blue-50'],
                    ['Overdue', overdue, CalendarClock, 'text-rose-700', 'bg-rose-50'],
                    ['Follow-ups pending', pending, CheckCircle2, 'text-orange-700', 'bg-orange-50']
                ].map(([label, value, Icon, color, background]) => (
                    <article
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${background} ${color}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
                    </article>
                ))}
            </section>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:max-w-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search invoice or customer"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
            </div>

            {loadError && (
                <div className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
                    <span>{loadError}. Restart the app and try again.</span>
                    <button type="button" onClick={loadCollections} className="self-start font-semibold underline sm:self-auto">Retry</button>
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="w-full overflow-hidden">
                    <table className="w-full table-fixed text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="w-[20%] px-3 py-3 sm:px-5 text-left">Invoice / Customer</th>
                                <th className="hidden w-[15%] px-3 py-3 md:table-cell sm:px-5 text-left">Due</th>
                                <th className="w-[18%] px-3 py-3 sm:px-5 text-left">Outstanding</th>
                                <th className="w-[16%] px-3 py-3 sm:px-5 text-left">Status</th>
                                <th className="hidden w-[16%] px-3 py-3 md:table-cell sm:px-5 text-left">Next follow-up</th>
                                <th className="w-[15%] px-3 py-3 text-right sm:px-5">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row) => (
                                <React.Fragment key={row.invoice_id}>
                                    {/* Main row */}
                                    <tr className="border-t border-slate-100 align-top">
                                        <td className="wrap-break-word px-3 py-4 sm:px-5">
                                            <p className="font-bold text-slate-900">{row.invoice_number}</p>
                                            <p className="mt-1 text-slate-600">{row.customer_name}</p>
                                            <p className="mt-1 text-xs text-slate-400 md:hidden">
                                                Due: {dateLabel(row.due_date)}
                                            </p>
                                        </td>
                                        <td className="hidden px-3 py-4 md:table-cell sm:px-5">
                                            <p className={row.payment_status === 'OVERDUE' ? 'font-semibold text-rose-700' : 'text-slate-600'}>
                                                {dateLabel(row.due_date)}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">{Status(row.payment_status)}</p>
                                        </td>
                                        <td className="wrap-break-word px-3 py-4 font-bold text-slate-900 sm:px-5">
                                            {money(row.balance_due)}
                                        </td>
                                        <td className="px-3 py-4 sm:px-5">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 sm:text-xs ${statusChipClass(row.followup_status)}`}>
                                                {statusLabel(row.followup_status)}
                                            </span>
                                        </td>
                                        <td className="hidden px-3 py-4 md:table-cell sm:px-5">
                                            <p className="text-xs text-slate-600">{dateLabel(row.next_followup_date)}</p>
                                        </td>
                                        <td className="px-3 py-4 sm:px-5">
                                            <div className="flex justify-end gap-1 sm:gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditor(row)}
                                                    title="Edit follow-up"
                                                    aria-label={`Edit follow-up for ${row.invoice_number}`}
                                                    className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => sendWhatsApp(row)}
                                                    title="Send WhatsApp reminder to customer"
                                                    aria-label={`Send WhatsApp reminder for ${row.invoice_number}`}
                                                    className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700"
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openHistory(row)}
                                                    title="View follow-up history"
                                                    aria-label={`View follow-up history for ${row.invoice_number}`}
                                                    className="rounded-lg bg-slate-200 p-2 text-slate-700 hover:bg-slate-300"
                                                >
                                                    <History className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* ✅ New row for notes */}
                                    <tr className="border-t border-slate-100">
                                        <td colSpan="6" className="px-3 py-2 text-xs text-slate-600 bg-slate-50">
                                            <p>
                                                <span className="font-semibold text-slate-700">Note:</span> {row.notes || '-'}
                                            </p>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                            {!visibleRows.length && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                                        No outstanding invoices found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {
                editingRow && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setEditingRow(null)}>
                        <form className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} onSubmit={saveEditor}>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Update follow-up</h2>
                                    <p className="mt-1 text-sm text-slate-500">{editingRow.invoice_number} · {editingRow.customer_name}</p>
                                </div>
                                <button type="button" onClick={() => setEditingRow(null)} className="text-sm font-semibold text-slate-500">Close</button>
                            </div>
                            <div className="mt-6 space-y-4">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Next follow-up
                                    <input
                                        type="date"
                                        value={editForm.nextFollowupDate}
                                        onChange={(event) => setEditForm((current) => ({ ...current, nextFollowupDate: event.target.value }))}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                    />
                                </label>
                                <label className="block text-sm font-semibold text-slate-700">
                                    Status
                                    <select
                                        value={editForm.status}
                                        onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                                    >
                                        {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </label>
                                <label className="block text-sm font-semibold text-slate-700">
                                    Note
                                    <textarea
                                        value={editForm.notes}
                                        onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                                        placeholder="Add an internal note"
                                        rows={4}
                                        className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500"
                                    />
                                </label>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditingRow(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={!hasEditorChanges || saving === editingRow.invoice_id} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                                    {saving === editingRow.invoice_id ? 'Saving...' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {
                historyInvoice && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
                        onClick={() => setHistoryInvoice(null)}
                    >
                        <div
                            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-bold text-slate-900">Follow-up history</h2>
                                    <p className="text-sm text-slate-500">
                                        {historyInvoice.invoice_number} · {historyInvoice.customer_name}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setHistoryInvoice(null)}
                                    className="text-sm font-semibold hover:bg-slate-200 p-2 rounded-md cursor-pointer text-slate-500"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="mt-5 max-h-80 space-y-3 overflow-y-auto">
                                {history.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                                        <div className="flex justify-between gap-3">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusChipClass(item.status)}`}>
                                                {statusLabel(item.status)}
                                            </span>
                                            <span className="text-xs text-slate-400">{dateLabel(item.created_at)}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-600">{item.notes || 'No note added.'}</p>
                                    </div>
                                ))}
                                {!history.length && (
                                    <p className="py-8 text-center text-sm text-slate-500">
                                        No follow-up history yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </main >
    );
}
