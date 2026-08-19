'use client';

import { Building2, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export default function OrganizationsPage() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [organizationToDelete, setOrganizationToDelete] = useState(null);

    useEffect(() => {
        const loadOrganizations = async () => {
            try {
                const response = await fetch('/api/organizations');
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Failed to load organizations.');
                setOrganizations(result.data || []);
            } catch (error) {
                toast.error(error.message);
            } finally {
                setLoading(false);
            }
        };
        loadOrganizations();
    }, []);

    const selectOrganization = async (organization) => {
        setSelecting(organization.id);
        try {
            const response = await fetch('/api/auth/organization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: organization.id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Unable to select organization.');

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            sessionStorage.setItem('currentUser', JSON.stringify({
                ...currentUser,
                organizationId: organization.id,
                organizationName: organization.name,
                company_name: organization.name,
            }));
            router.push('/dashboard');
        } catch (error) {
            toast.error(error.message);
            setSelecting(null);
        }
    };

    const deleteOrganization = async () => {
        if (!organizationToDelete) return;

        const organization = organizationToDelete;
        setDeleting(organization.id);
        try {
            const response = await fetch('/api/organizations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: organization.id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to delete organization.');

            const remainingOrganizations = organizations.filter((item) => item.id !== organization.id);
            setOrganizations(remainingOrganizations);
            setOrganizationToDelete(null);
            toast.success('Organization deleted successfully.');

            if (remainingOrganizations.length === 0) {
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
                sessionStorage.setItem('currentUser', JSON.stringify({
                    ...currentUser,
                    organizationId: null,
                    organizationName: '',
                    company_name: currentUser.company_name || '',
                }));
                router.push('/organization?mode=create');
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setDeleting(null);
        }
    };

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading organizations...</div>;
    }

    return (
        <main className="min-h-screen font-sans bg-slate-50 px-5 py-10">
            <section className="mx-auto max-w-4xl">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.10em] text-blue-600">Workspace</p>
                        <h1 className="mt-1 text-3xl font-bold text-slate-900">Choose an organization</h1>
                        <p className="mt-2 text-slate-500">Select where you want to manage invoices and inventory.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push('/organization?mode=create')}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
                    >
                        <Plus size={18} /> New organization
                    </button>
                </div>

                {organizations.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                        No organizations found.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {organizations.map((organization) => (
                            <div
                                key={organization.id}
                                onClick={() => selectOrganization(organization)}
                                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white cursor-pointer p-5 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md"
                            >
                                <span className="flex items-center gap-4">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                        <Building2 size={24} />
                                    </span>
                                    <span>
                                        <span className="block text-lg font-semibold text-slate-900">{organization.name}</span>
                                        <span className="mt-1 block text-sm text-slate-500">{organization.industry || 'Organization'}</span>
                                    </span>
                                </span>
                                <span className="ml-3 flex shrink-0 items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={selecting !== null || deleting !== null}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setOrganizationToDelete(organization);
                                        }}
                                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label={`Delete ${organization.name}`}
                                        title="Delete organization"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <ArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" size={20} />
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {organizationToDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-5"
                    onClick={() => deleting === null && setOrganizationToDelete(null)}
                >
                    <div
                        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="text-xl font-semibold text-slate-900">Delete organization?</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Delete <strong>{organizationToDelete.name}</strong>? Its invoices, customers, and items will also be deleted.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={deleting !== null}
                                onClick={() => setOrganizationToDelete(null)}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deleting !== null}
                                onClick={deleteOrganization}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Trash2 size={17} />
                                {deleting !== null ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
