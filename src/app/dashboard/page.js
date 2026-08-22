"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowUpRight,
    CircleDollarSign,
    FilePlus2,
    FileText,
    Package,
    Plus,
    RefreshCw,
    Sparkles,
    Users,
} from "lucide-react";

const tabs = ["Overview", "Revenue", "Inventory"];

const getTimeGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 16) return "Good Afternoon";
    if (hour >= 16 && hour < 20) return "Good Evening";
    return "Good Night";
};

const parseResponse = async (response) => {
    if (!response.ok) return { data: [] };
    const result = await response.json();
    return result?.success ? result : { data: [] };
};

const formatCurrency = (value, currency = "INR") =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatNumber = (value) =>
    new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

const formatDate = (value) => {
    if (!value) return "No date";
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("Overview");
    const [data, setData] = useState({ invoices: [], customers: [], items: [] });
    const [collectionSummary, setCollectionSummary] = useState({ dueToday: 0, overdue: 0, followupsPending: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [userName, setUserName] = useState("there");
    const [timeGreeting, setTimeGreeting] = useState(getTimeGreeting);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError(false);
            const [invoiceResult, customerResult, itemResult, collectionResult] = await Promise.all([
                fetch("/api/invoices").then(parseResponse),
                fetch("/api/customers").then(parseResponse),
                fetch("/api/items?limit=100").then(parseResponse),
                fetch("/api/collections").then(parseResponse),
            ]);
            setData({ invoices: invoiceResult.data || [], customers: customerResult.data || [], items: itemResult.data || [] });
            setCollectionSummary(collectionResult.summary || { dueToday: 0, overdue: 0, followupsPending: 0 });
        } catch (loadError) {
            console.error("Failed to load dashboard:", loadError);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();

        const greetingTimer = window.setInterval(() => {
            setTimeGreeting(getTimeGreeting());
        }, 30000);

        // Directly get username from sessionStorage
        try {
            const storedUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");
            const username = storedUser?.username || "N/A";
            setUserName(username);
        } catch (userError) {
            console.error("Failed to get user from sessionStorage:", userError);
            setUserName("N/A");
        }

        return () => window.clearInterval(greetingTimer);
    }, []);

    const stats = useMemo(() => {
        const revenue = data.invoices.reduce((total, invoice) => total + Number(invoice.grand_total || 0), 0);
        const lowStock = data.items.filter((item) => String(item.status).toLowerCase() !== "active").length;
        return [
            { label: "Total revenue", value: formatNumber(revenue), detail: `${data.invoices.length} invoices raised`, icon: CircleDollarSign, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Invoices created", value: data.invoices.length, detail: "All-time invoice count", icon: FileText, color: "text-blue-700", bg: "bg-blue-50" },
            { label: "Customers", value: data.customers.length, detail: "People in your network", icon: Users, color: "text-sky-700", bg: "bg-sky-50" },
            { label: "Stock alerts", value: lowStock, detail: lowStock ? "Needs your attention" : "Everything looks healthy", icon: Package, color: "text-indigo-700", bg: "bg-indigo-50" },
        ];
    }, [data]);

    const visibleStats = activeTab === "Revenue" ? stats.slice(0, 2) : activeTab === "Inventory" ? stats.slice(2) : stats;
    const recentInvoices = data.invoices.slice(0, 5);
    const visibleItems = data.items.slice(0, 4);

    return (
        <main className="mx-auto font-sans w-full max-w-7xl space-y-6 pb-8">
            <section
                className="relative overflow-hidden rounded-3xl bg-blue-900 bg-cover bg-center px-6 py-4 text-white sm:px-8 sm:py-5"
                style={{ backgroundImage: "url('/bg-image.webp')" }}
            >
                <div className="absolute inset-0 bg-blue-950/70" />
                <div className="absolute inset-0 bg-linear-to-r from-blue-950 via-blue-900/45 to-blue-900/20" />
                <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-100">
                            <Sparkles className="h-4 w-4" />
                            Your business at a glance
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">{timeGreeting}, {userName}.</h1>
                        <p className="mt-2 max-w-lg text-sm leading-6 text-blue-100 sm:text-base">Turn today&apos;s work into momentum. Keep invoices moving, customers close, and stock ready.</p>
                    </div>
                    <div className="flex shrink-0 gap-5 items-center">
                        <Link href="/dashboard/invoice?create=true" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50">
                            <FilePlus2 className="h-4 w-4" />
                            Create invoice
                        </Link>
                        <Link href="/dashboard/customer?create=true" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                            <Plus className="h-4 w-4" />
                            Add customer
                        </Link>
                    </div>
                </div>
            </section>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase text-slate-400">Control Center</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Real-time business overview</h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                        {tabs.map((tab) =>
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 ${activeTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-blue-700"}`}>
                                {tab}
                            </button>
                        )}
                    </div>
                    <button aria-label="Refresh dashboard" title="Refresh dashboard" onClick={loadDashboard} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {error &&
                <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <span>We could not refresh your dashboard data.</span>
                    <button onClick={loadDashboard} className="font-bold underline">Try again</button>
                </div>
            }

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleStats.map(({ label, value, detail, icon: Icon, color, bg }) =>
                    <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg} ${color}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="mt-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{label}</p>
                                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                                    {loading ? "--" : value}</p>
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{detail}</p>
                    </article>
                )}
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                {[
                    ["Due today", collectionSummary.dueToday, "text-blue-700", "bg-blue-50"],
                    ["Overdue", collectionSummary.overdue, "text-rose-700", "bg-rose-50"],
                    ["Follow-ups pending", collectionSummary.followupsPending, "text-orange-700", "bg-orange-50"],
                ].map(([label, value, color, bg]) => (
                    <Link key={label} href="/dashboard/collection" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                        <p className="text-sm font-medium text-slate-500">{label}</p>
                        <p className={`mt-2 text-3xl font-bold ${color}`}>{loading ? "--" : value}</p>
                        <p className="mt-1 text-xs text-slate-400">Open collections</p>
                    </Link>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
                        <div>
                            <h3 className="font-bold text-slate-900">Recent invoices</h3>
                            <p className="mt-1 text-xs text-slate-400">The latest activity from your business</p>
                        </div>
                        <Link href="/dashboard/invoice" className="text-xs font-bold text-blue-600 hover:text-blue-800">View all</Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {loading ?
                            <div className="px-5 py-10 text-center text-sm text-slate-400">Loading activity...</div>
                            :
                            recentInvoices.length
                                ? recentInvoices.map((invoice) =>
                                    <div key={invoice.id || invoice.invoice_number} className="flex items-center justify-between gap-3 px-5 py-4">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-800">{invoice.customer_name || "Customer"}</p>
                                                <p className="mt-1 text-xs text-slate-400">{invoice.invoice_number} · {formatDate(invoice.created_at)}</p>
                                            </div>
                                        </div>
                                        <p className="whitespace-nowrap text-sm font-bold text-slate-900">{formatCurrency(invoice.grand_total, invoice.currency)}</p>
                                    </div>)
                                : <div className="px-5 py-10 text-center text-sm text-slate-400">No invoices yet. Your first one starts the story.</div>
                        }
                    </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900">Inventory snapshot</h3>
                            <p className="mt-1 text-xs text-slate-400">Your most recently added items</p>
                        </div>
                        <Link href="/dashboard/item" className="text-xs font-bold text-blue-600 hover:text-blue-800">Manage</Link>
                    </div>
                    <div className="mt-5 space-y-4">
                        {loading
                            ? <p className="py-6 text-center text-sm text-slate-400">Loading inventory...</p>
                            : visibleItems.length
                                ? visibleItems.map((item) =>
                                    <div key={item.id} className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-50 text-center text-sm font-bold leading-9 text-blue-700">{item.name?.charAt(0)?.toUpperCase() || "I"}</div>
                                            <p className="truncate text-sm font-semibold text-slate-700">{item.name}</p>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${String(item.status).toLowerCase() === "active" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{item.status || "Unknown"}</span>
                                    </div>
                                )
                                : <p className="py-6 text-center text-sm text-slate-400">No items added yet.</p>
                        }
                    </div>
                </article>
            </section>
        </main>
    );
}