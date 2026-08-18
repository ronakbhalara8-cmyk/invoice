'use client';

import {useEffect, useMemo, useState} from 'react';
import {FileText, Plus, Trash2, X} from 'lucide-react';
import {toast} from 'react-toastify';

const emptyItem = () => ({
    id: Date.now() + Math.random(),
    name: '',
    qty: 1,
    rate: 0,
    discount: 0,
});

const calculateItemAmount = (item) => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const discount = Number(item.discount || 0);
    return qty * rate * (1 - discount / 100);
};

const defaultCompany = {
    company_name: '',
    company_address: '',
    company_gst_number: '',
};

const sanitizePhoneValue = (value = '') => value.replace(/\D/g, '').slice(0, 15);

const isValidPhoneNumber = (value = '') => {
    const digits = sanitizePhoneValue(value);
    return digits.length === 10;
};

const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const isItemRowComplete = (item = {}) => {
    const name = item.name?.trim();
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const discount = Number(item.discount || 0);

    return Boolean(name) && qty > 0 && rate > 0 && discount >= 0 && discount <= 100;
};

export default function InvoiceForm({onCancel, onInvoiceCreated}) {
    const [companyInfo, setCompanyInfo] = useState(defaultCompany);
    const [billingTo, setBillingTo] = useState({
        customer_name: '',
        company_name: '',
        address: '',
        email: '',
        phone: '',
    });
    const [shippingTo, setShippingTo] = useState({
        customer_name: '',
        company_name: '',
        address: '',
        email: '',
        phone: '',
    });
    const [items, setItems] = useState([emptyItem()]);
    const [gstRate, setGstRate] = useState(18);
    const [terms, setTerms] = useState('Payment due within 15 days. Late fees may apply.');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            if (user) {
                setCompanyInfo((prev) => ({
                    ...prev,
                    company_name: user.organizationName || user.company_name || prev.company_name,
                    company_gst_number: user.gstNumber || user.gst_number || prev.company_gst_number,
                }));
            }
        } catch (error) {
            console.error('Unable to load current user info', error);
        }
    }, []);

    const subtotal = useMemo(
        () => items.reduce((sum, item) => sum + calculateItemAmount(item), 0),
        [items]
    );

    const discountAmount = useMemo(
        () => items.reduce((sum, item) => {
            const qty = Number(item.qty || 0);
            const rate = Number(item.rate || 0);
            const discount = Number(item.discount || 0);
            return sum + (qty * rate * (discount / 100));
        }, 0),
        [items]
    );

    const gstAmount = useMemo(
        () => subtotal * (Number(gstRate || 0) / 100),
        [subtotal, gstRate]
    );

    const grandTotal = useMemo(
        () => subtotal + gstAmount,
        [subtotal, gstAmount]
    );

    const updateItem = (id, field, value) => {
        setItems((prev) => {
            const updatedItems = prev.map((item) => {
                if (item.id !== id) return item;
                return {...item, [field]: value};
            });

            const activeItem = updatedItems.find((item) => item.id === id);
            const isLastRow = updatedItems.at(-1)?.id === id;

            if (isLastRow && activeItem && isItemRowComplete(activeItem)) {
                return [...updatedItems, emptyItem()];
            }

            return updatedItems;
        });
    };

    const addItemRow = () => {
        setItems((prev) => [...prev, emptyItem()]);
    };

    const removeItemRow = (id) => {
        setItems((prev) => {
            if (prev.length === 1) return [emptyItem()];
            return prev.filter((item) => item.id !== id);
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validItems = items.filter((item) => item.name?.trim());
        if (!companyInfo.company_name || validItems.length === 0) {
            toast.error('Please fill company info and at least one item.');
            return;
        }

        const requiredBillingFields = [
            ['customer_name', billingTo.customer_name],
            ['company_name', billingTo.company_name],
            ['address', billingTo.address],
            ['email', billingTo.email],
            ['phone', billingTo.phone],
        ];

        const missingBillingField = requiredBillingFields.find(([, value]) => !String(value || '').trim());
        if (missingBillingField) {
            toast.error('Please fill all Billing To fields before generating the invoice.');
            return;
        }

        if (!isValidEmail(billingTo.email)) {
            toast.error('Please enter a valid billing email address.');
            return;
        }

        if (!isValidPhoneNumber(billingTo.phone)) {
            toast.error('Please enter a valid billing mobile number with exactly 10 digits.');
            return;
        }

        const requiredShippingFields = [
            ['customer_name', shippingTo.customer_name],
            ['company_name', shippingTo.company_name],
            ['address', shippingTo.address],
            ['email', shippingTo.email],
            ['phone', shippingTo.phone],
        ];

        const missingShippingField = requiredShippingFields.find(([, value]) => !String(value || '').trim());
        if (missingShippingField) {
            toast.error('Please fill all Shipping To fields before generating the invoice.');
            return;
        }

        if (!isValidEmail(shippingTo.email)) {
            toast.error('Please enter a valid shipping email address.');
            return;
        }

        if (!isValidPhoneNumber(shippingTo.phone)) {
            toast.error('Please enter a valid shipping mobile number with exactly 10 digits.');
            return;
        }

        const payload = {
            companyInfo: {
                company_name: companyInfo.company_name,
                company_address: companyInfo.company_address,
                company_gst_number: companyInfo.company_gst_number,
            },
            billingTo: {
                customer_name: billingTo.customer_name,
                company_name: billingTo.company_name,
                address: billingTo.address,
                email: billingTo.email,
                phone: billingTo.phone,
            },
            shippingTo: {
                customer_name: shippingTo.customer_name,
                company_name: shippingTo.company_name,
                address: shippingTo.address,
                email: shippingTo.email,
                phone: shippingTo.phone,
            },
            items: validItems.map((item) => ({
                name: item.name.trim(),
                qty: Number(item.qty || 0),
                rate: Number(item.rate || 0),
                discount: Number(item.discount || 0),
                amount: calculateItemAmount(item),
            })),
            gstRate: Number(gstRate || 0),
            subtotal,
            discountAmount,
            gstAmount,
            grandTotal,
            terms,
        };

        try {
            setSubmitting(true);
            const response = await fetch('/api/invoices', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
            });

            const text = await response.text();
            let result = null;
            if (text) {
                try {
                    result = JSON.parse(text);
                } catch (parseError) {
                    console.error('Invalid JSON returned while creating invoice:', parseError, text.slice(0, 300));
                    throw new Error('The server returned an invalid response while creating the invoice.');
                }
            }

            if (!response.ok || !result?.success) {
                throw new Error(result?.message || 'Unable to create invoice.');
            }

            toast.success('Invoice generated successfully.');
            if (onInvoiceCreated) onInvoiceCreated(result.data);
        } catch (error) {
            console.error('Invoice creation failed:', error);
            toast.error(error.message || 'Failed to create invoice.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rounded-[28px] font-sans border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Create</p>
                        <h2 className="text-2xl font-bold text-slate-900">Generate Invoice</h2>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                    <X className="h-4 w-4" />
                    Close
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <section className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-3">
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Company Info</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Company name</label>
                        <input
                            value={companyInfo.company_name}
                            onChange={(event) => setCompanyInfo((prev) => ({...prev, company_name: event.target.value}))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                            placeholder="Acme Pvt Ltd"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Company address</label>
                        <input
                            value={companyInfo.company_address}
                            onChange={(event) => setCompanyInfo((prev) => ({...prev, company_address: event.target.value}))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                            placeholder="Enter your company address"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                        <label className="text-sm font-medium text-slate-700">Company GST Number</label>
                        <input
                            value={companyInfo.company_gst_number}
                            onChange={(event) => setCompanyInfo((prev) => ({...prev, company_gst_number: event.target.value}))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                            placeholder="27ABCDE1234F1Z5"
                        />
                    </div>
                </section>

                <section className="grid gap-5 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Billing To</h3>
                        <div className="space-y-3">
                            <input
                                required
                                value={billingTo.customer_name}
                                onChange={(event) => setBillingTo((prev) => ({...prev, customer_name: event.target.value}))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Enter your name"
                            />
                            <input
                                required
                                value={billingTo.company_name}
                                onChange={(event) => setBillingTo((prev) => ({...prev, company_name: event.target.value}))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Company name"
                            />
                            <textarea
                                required
                                value={billingTo.address}
                                onChange={(event) => setBillingTo((prev) => ({...prev, address: event.target.value}))}
                                className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Billing address"
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <input
                                    type='email'
                                    required
                                    value={billingTo.email}
                                    onChange={(event) => setBillingTo((prev) => ({...prev, email: event.target.value}))}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                    placeholder="Email"
                                />
                                <input
                                    type='tel'
                                    required
                                    inputMode="numeric"
                                    value={billingTo.phone}
                                    onChange={(event) => setBillingTo((prev) => ({...prev, phone: sanitizePhoneValue(event.target.value)}))}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                    placeholder="Phone"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Shipping To</h3>
                        <div className="space-y-3">
                            <input
                                required
                                value={shippingTo.customer_name}
                                onChange={(event) => setShippingTo((prev) => ({...prev, customer_name: event.target.value}))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Customer name"
                            />
                            <input
                                required
                                value={shippingTo.company_name}
                                onChange={(event) => setShippingTo((prev) => ({...prev, company_name: event.target.value}))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Company name"
                            />
                            <textarea
                                required
                                value={shippingTo.address}
                                onChange={(event) => setShippingTo((prev) => ({...prev, address: event.target.value}))}
                                className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Shipping address"
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <input
                                    type='email'
                                    required
                                    value={shippingTo.email}
                                    onChange={(event) => setShippingTo((prev) => ({...prev, email: event.target.value}))}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                    placeholder="Email"
                                />
                                <input
                                    type='tel'
                                    required
                                    inputMode="numeric"
                                    value={shippingTo.phone}
                                    onChange={(event) => setShippingTo((prev) => ({...prev, phone: sanitizePhoneValue(event.target.value)}))}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                    placeholder="Phone"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-slate-500">Product Items</h3>
                        <button
                            type="button"
                            onClick={addItemRow}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500"
                        >
                            <Plus className="h-4 w-4" />
                            Add Item
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="text-slate-600">
                                    <th className="pb-3 pr-3 text-base font-medium text-slate-700">Name</th>
                                    <th className="pb-3 pr-3 text-base font-medium text-slate-700">Qty</th>
                                    <th className="pb-3 pr-3 text-base font-medium text-slate-700">Rate</th>
                                    <th className="pb-3 pr-3 text-base font-medium text-slate-700">Discount (%)</th>
                                    <th className="pb-3 pr-3 text-base font-medium text-slate-700">Amount</th>
                                    <th className="pb-3 pl-2 text-right text-base font-medium text-slate-700">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => {
                                    const amount = calculateItemAmount(item);

                                    return (
                                        <tr key={item.id} className="align-top">
                                            <td className="py-3 pr-3">
                                                <textarea
                                                    rows={2}
                                                    value={item.name}
                                                    onChange={(event) => updateItem(item.id, 'name', event.target.value)}
                                                    className="min-h-[52px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                                                    placeholder="Item name"
                                                />
                                            </td>
                                            <td className="py-3 pr-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.qty}
                                                    onChange={(event) => updateItem(item.id, 'qty', event.target.value)}
                                                    className="w-[76px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-slate-900 outline-none transition focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="py-3 pr-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.rate}
                                                    onChange={(event) => updateItem(item.id, 'rate', event.target.value)}
                                                    className="w-[108px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="py-3 pr-3">
                                                <div className="relative w-[118px]">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        value={item.discount}
                                                        onChange={(event) => updateItem(item.id, 'discount', event.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-slate-900 outline-none transition focus:border-blue-500"
                                                    />
                                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">%</span>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <div className="flex w-[110px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right font-semibold text-slate-800">
                                                    ₹{amount.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="py-3 pl-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItemRow(item.id)}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
                                                    aria-label="Remove item"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="grid gap-5 md:grid-cols-[1fr_280px]">
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700">Terms</label>
                        <textarea
                            value={terms}
                            onChange={(event) => setTerms(event.target.value)}
                            className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                            placeholder="Enter payment terms"
                        />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-slate-600">
                                <span>Sub Total</span>
                                <span className="font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-600">
                                <span>Discount</span>
                                <span className="font-semibold text-slate-900">₹{discountAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700">GST Rate</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={gstRate}
                                    onChange={(event) => setGstRate(event.target.value)}
                                    className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                                />
                                <span className="text-sm text-slate-600">%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-600">
                                <span>GST Amount</span>
                                <span className="font-semibold text-slate-900">₹{gstAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                                <span>Grand Total</span>
                                <span>₹{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? 'Generating...' : 'Generate Invoice'}
                    </button>
                </div>
            </form>
        </div>
    );
}
