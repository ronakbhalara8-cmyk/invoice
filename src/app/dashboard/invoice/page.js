"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FilePlus2, FileText } from 'lucide-react';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import InvoiceList from '@/components/invoices/InvoiceList';
import { downloadInvoicePdf } from '@/components/invoices/InvoicePDF';

const parseJsonSafely = async (response) => {
    if (!response) return null;

    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Invalid JSON response:', error, text.slice(0, 300));
        throw new Error('Server returned an invalid JSON response.');
    }
};

function InvoicePageContent() {
    const searchParams = useSearchParams();
    const [showForm, setShowForm] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/invoices');
            const result = await parseJsonSafely(response);

            if (result?.success) {
                setInvoices(result.data || []);
            } else {
                setInvoices([]);
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoices();
    }, []);

    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            setShowForm(true);
        }
    }, [searchParams]);

    const handleInvoiceCreated = (invoice) => {
        setInvoices((prev) => [invoice, ...prev]);
        setShowForm(false);
    };

    const handleDownload = (invoice) => {
        downloadInvoicePdf({
            ...invoice,
            company_info: invoice.company_info || {},
            billing_to: invoice.billing_to || {},
            shipping_to: invoice.shipping_to || {},
            items: Array.isArray(invoice.items) ? invoice.items : [],
        });
    };

    return (
        <div className="space-y-6">
            {showForm ? (
                <InvoiceForm onCancel={() => setShowForm(false)} onInvoiceCreated={handleInvoiceCreated} />
            ) : (
                <>
                    <div className="">
                        <div className="flex flex-col font-sans gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                                <p className="mt-1 text-sm text-gray-500">{invoices.length} invoices • Manage your invoices and track payments efficiently</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700"
                                >
                                    <FilePlus2 className="h-4 w-4" />
                                    Generate Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                    <InvoiceList
                        invoices={invoices}
                        loading={loading}
                        onRefresh={loadInvoices}
                        onDownload={handleDownload}
                    />
                </>
            )}
        </div>
    );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div className="min-h-32" />}>
            <InvoicePageContent />
        </Suspense>
    );
}