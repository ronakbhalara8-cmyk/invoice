'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileCheck2, FilePlus2 } from 'lucide-react';
import QuotationForm from '@/components/quotations/QuotationForm';
import QuotationList from '@/components/quotations/QuotationList';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import { downloadQuotationPdf } from '@/components/quotations/QuotationPDF';

function QuotationPageContent() {
    const searchParams = useSearchParams();
    const [showForm, setShowForm] = useState(false);
    const [quotations, setQuotations] = useState([]);
    const [editingQuotation, setEditingQuotation] = useState(null);
    const [quotationToDelete, setQuotationToDelete] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadQuotations = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/quotations');
            const result = await response.json();
            setQuotations(result?.success ? result.data || [] : []);
        } catch (error) {
            console.error('Failed to load quotations:', error);
            setQuotations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuotations();
    }, []);

    useEffect(() => {
        if (searchParams.get('create') === 'true') openCreate();
    }, [searchParams]);

    const openCreate = () => {
        setEditingQuotation(null);
        setShowForm(true);
    };

    const handleSaved = (quotation) => {
        setQuotations((current) =>
            editingQuotation
                ? current.map((item) => (item.id === quotation.id ? quotation : item))
                : [quotation, ...current]
        );
        setEditingQuotation(null);
        setShowForm(false);
    };

    return (
        <>
            <div className="space-y-6">
                {showForm ? (
                    <QuotationForm
                        quotation={editingQuotation}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingQuotation(null);
                        }}
                        onSaved={handleSaved}
                    />
                ) : (
                    <>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                                    <FileCheck2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                                        Sales documents
                                    </p>
                                    <h1 className="text-3xl font-bold text-slate-900">Quotations</h1>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={openCreate}
                                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500"
                            >
                                <FilePlus2 className="h-4 w-4" />
                                Create quotation
                            </button>
                        </div>

                        <QuotationList
                            quotations={quotations}
                            loading={loading}
                            onRefresh={loadQuotations}
                            onEdit={(quotation) => {
                                setEditingQuotation(quotation);
                                setShowForm(true);
                            }}
                            onDelete={setQuotationToDelete}
                            onDownload={downloadQuotationPdf}
                        />
                    </>
                )}
            </div>

            <DeleteConfirmModal
                isOpen={Boolean(quotationToDelete)}
                item={quotationToDelete}
                apiPath={quotationToDelete ? `/api/quotations/${quotationToDelete.id}` : ''}
                resourceLabel="quotation"
                resourceName={quotationToDelete?.quotation_number}
                onClose={() => setQuotationToDelete(null)}
                onDeleted={(quotationId) => {
                    setQuotations((current) => current.filter((item) => item.id !== quotationId));
                }}
            />
        </>
    );
}

export default function QuotationPage() {
    return (
        <Suspense fallback={<div className="min-h-32" />}>
            <QuotationPageContent />
        </Suspense>
    );
}