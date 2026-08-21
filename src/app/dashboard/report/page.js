"use client";

import { useEffect, useMemo, useState } from "react";
import {
    BarChart3,
    CalendarDays,
    CircleDollarSign,
    FileText,
    Package,
    RefreshCw,
    TrendingUp,
    Users,
} from "lucide-react";

const periods = [
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" },
    { label: "This year", value: "year" },
    { label: "All time", value: "all" },
];

const parseResponse = async (response) => {
    if (!response.ok) throw new Error("Unable to load report data");
    const result = await response.json();
    if (!result?.success) throw new Error(result?.message || "Unable to load report data");
    return result.data || [];
};

const formatCurrency = (value, currency = "INR") => {
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency || "INR",
            maximumFractionDigits: 0,
        }).format(Number(value) || 0);
    } catch {
        return `INR ${Number(value) || 0}`;
    }
};

const formatNumber = (value) =>
    new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

const formatDate = (value) => value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : "No date";

const getStartDate = (period) => {
    if (period === "all") return null;
    const date = new Date();
    if (period === "year") return new Date(date.getFullYear(), 0, 1);
    date.setDate(date.getDate() - Number(period));
    return date;
};

const getInvoiceTotal = (invoice) => Number(invoice.grand_total || 0);

export default function ReportsPage() {
    const [period, setPeriod] = useState("30");
    const [data, setData] = useState({ invoices: [], customers: [], items: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadReport = async () => {
        try {
            setLoading(true);
            setError("");
            const [invoices, customers, items] = await Promise.all([
                fetch("/api/invoices").then(parseResponse),
                fetch("/api/customers").then(parseResponse),
                fetch("/api/items?limit=1000").then(parseResponse),
            ]);
            setData({ invoices, customers, items });
        } catch (loadError) {
            console.error("Failed to load reports:", loadError);
            setError("We could not load your report right now.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, []);

    const report = useMemo(() => {
        const startDate = getStartDate(period);
        const invoices = data.invoices.filter((invoice) => !startDate || new Date(invoice.created_at) >= startDate);
        const revenue = invoices.reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
        const customerTotals = invoices.reduce((totals, invoice) => {
            const name = invoice.customer_name || "Walk-in customer";
            totals[name] = (totals[name] || 0) + getInvoiceTotal(invoice);
            return totals;
        }, {});
        const topCustomers = Object.entries(customerTotals)
            .sort(([, first], [, second]) => second - first)
            .slice(0, 5);
        const months = Array.from({ length: 6 }, (_, index) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - index), 1);
            return {
                key: `${date.getFullYear()}-${date.getMonth()}`,
                label: date.toLocaleDateString("en-IN", { month: "short" }),
                total: 0,
            };
        });
        invoices.forEach((invoice) => {
            const date = new Date(invoice.created_at);
            const month = months.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
            if (month) month.total += getInvoiceTotal(invoice);
        });
        const maxMonth = Math.max(...months.map((month) => month.total), 1);
        const activeItems = data.items.filter((item) => String(item.status).toLowerCase() === "active").length;
        return {
            invoices,
            revenue,
            topCustomers,
            months,
            maxMonth,
            activeItems,
            lowStock: data.items.length - activeItems,
        };
    }, [data, period]);

    const stats = [
        {
            label: "Revenue",
            value: formatNumber(report.revenue),
            detail: `${report.invoices.length} invoices in period`,
            icon: CircleDollarSign,
            color: "text-emerald-700",
            background: "bg-emerald-50",
        },
        {
            label: "Invoices",
            value: report.invoices.length,
            detail: "Issued in selected period",
            icon: FileText,
            color: "text-blue-700",
            background: "bg-blue-50",
        },
        {
            label: "Average invoice",
            value: formatNumber(report.invoices.length ? report.revenue / report.invoices.length : 0),
            detail: "Average order value",
            icon: TrendingUp,
            color: "text-violet-700",
            background: "bg-violet-50",
        },
        {
            label: "Stock health",
            value: data.items.length ? `${Math.round((report.activeItems / data.items.length) * 100)}%` : "0%",
            detail: `${report.lowStock} items need attention`,
            icon: Package,
            color: "text-orange-700",
            background: "bg-orange-50",
        },
    ];

    return (
        <main className="mx-auto w-full font-sans max-w-7xl space-y-6 pb-8">
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                    <p className="mt-1 text-sm text-gray-500">Understand sales performance, customer value, and stock at a glance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        <span className="sr-only">Report period</span>
                        <select
                            value={period}
                            onChange={(event) => setPeriod(event.target.value)}
                            className="bg-transparent outline-none"
                        >
                            {periods.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={loadReport}
                        aria-label="Refresh report"
                        title="Refresh report"
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </header>

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                    <button onClick={loadReport} className="ml-2 font-bold underline">
                        Try again
                    </button>
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map(({ label, value, detail, icon: Icon, color, background }) => (
                    <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${background} ${color}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                            {loading ? "--" : value}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">{detail}</p>
                    </article>
                ))}
            </section>
            <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900">Revenue trend</h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Monthly invoice revenue for the last six months
                            </p>
                        </div>
                    </div>
                    <div className="mt-8 flex h-56 items-end gap-3 border-b border-slate-100 px-2">
                        {report.months.map((month) => (
                            <div
                                key={month.key}
                                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                            >
                                <span className="text-[10px] font-semibold text-slate-500">
                                    {formatNumber(month.total)}
                                </span>
                                <div
                                    className="w-full max-w-12 rounded-t-lg bg-blue-500 transition-all"
                                    style={{
                                        height: `${Math.max(
                                            (month.total / report.maxMonth) * 100,
                                            month.total ? 6 : 2,
                                        )}%`,
                                    }}
                                />
                                <span className="text-xs font-semibold text-slate-400">
                                    {month.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900">Top customers</h2>
                            <p className="mt-1 text-xs text-slate-400">Highest value in selected period</p>
                        </div>
                        <Users className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="mt-6 space-y-4">
                        {report.topCustomers.length ? (
                            report.topCustomers.map(([name, total], index) => (
                                <div key={name}>
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="truncate font-semibold text-slate-700">
                                            {index + 1}. {name}
                                        </span>
                                        <span className="whitespace-nowrap font-bold text-slate-900">
                                            {formatNumber(total)}
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-violet-500"
                                            style={{ width: `${(total / report.topCustomers[0][1]) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-400">
                                No customer sales in this period.
                            </p>
                        )}
                    </div>
                </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
                    <div>
                        <h2 className="font-bold text-slate-900">Recent sales</h2>
                        <p className="mt-1 text-xs text-slate-400">Invoices included in this report</p>
                    </div>
                    <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="divide-y divide-slate-100">
                    {report.invoices.slice(0, 8).map((invoice) => (
                        <div
                            key={invoice.id || invoice.invoice_number}
                            className="flex items-center justify-between gap-4 px-5 py-4"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">
                                    {invoice.customer_name || "Customer"}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    {invoice.invoice_number} · {formatDate(invoice.created_at)}
                                </p>
                            </div>
                            <p className="whitespace-nowrap text-sm font-bold text-slate-900">
                                {formatCurrency(getInvoiceTotal(invoice), invoice.currency)}
                            </p>
                        </div>
                    ))}
                    {!report.invoices.length && (
                        <p className="px-5 py-10 text-center text-sm text-slate-400">
                            No invoices found for this period.
                        </p>
                    )}
                </div>
            </section>
        </main>
    );
}