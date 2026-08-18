'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { FileText, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';

const emptyItem = () => ({
    id: Date.now() + Math.random(),
    item_id: '',
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
    currency: 'INR',
};

const DEFAULT_CURRENCY = 'INR';

const normalizeCurrencyCode = (value = DEFAULT_CURRENCY) => {
    const code = String(value || DEFAULT_CURRENCY).trim().toUpperCase();
    return code || DEFAULT_CURRENCY;
};

const formatCurrencyValue = (value, currencyCode = DEFAULT_CURRENCY) => {
    const code = normalizeCurrencyCode(currencyCode);

    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(value || 0));
    } catch (error) {
        return `${code} ${Number(value || 0).toFixed(2)}`;
    }
};

const getCurrencySymbol = (currencyCode = DEFAULT_CURRENCY) => {
    const code = normalizeCurrencyCode(currencyCode);

    try {
        const parts = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: code,
            currencyDisplay: 'narrowSymbol',
        }).formatToParts(0);
        return parts.find((part) => part.type === 'currency')?.value || code;
    } catch (error) {
        return code;
    }
};

const sanitizePhoneValue = (value = '') => value.replace(/\D/g, '').slice(0, 15);

const isValidPhoneNumber = (value = '') => {
    const digits = sanitizePhoneValue(value);
    return digits.length === 10;
};

const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

// Check if item has name, qty, and rate filled (discount is optional)
const isItemRowComplete = (item = {}) => {
    const name = item.name?.trim();
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const discount = Number(item.discount || 0);

    // Only name, qty, and rate are required - discount is optional
    return Boolean(name) && qty > 0 && rate > 0 && discount >= 0 && discount <= 100;
};

export default function InvoiceForm({ onCancel, onInvoiceCreated }) {
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
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedCustomerFirstName, setSelectedCustomerFirstName] = useState('');
    const [selectedCustomerLastName, setSelectedCustomerLastName] = useState('');
    const [itemCatalog, setItemCatalog] = useState([]);
    const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRefs = useRef({});

    const loadCustomers = async () => {
        try {
            const response = await fetch('/api/customers');
            const result = await response.json();
            if (result?.success) {
                setCustomers(result.data || []);
                return;
            }
            setCustomers([]);
        } catch (error) {
            console.error('Failed to load customers:', error);
            setCustomers([]);
        }
    };

    const loadActiveItems = async () => {
        try {
            const response = await fetch('/api/items?status=Active&limit=1000');
            const result = await response.json();
            if (result?.success) {
                setItemCatalog(Array.isArray(result.data) ? result.data : []);
                return;
            }
            setItemCatalog([]);
        } catch (error) {
            console.error('Failed to load item catalog:', error);
            setItemCatalog([]);
        }
    };

    useEffect(() => {
        loadCustomers();
        loadActiveItems();

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdownId !== null) {
                const ref = dropdownRefs.current[openDropdownId];
                if (ref && !ref.contains(event.target)) {
                    setOpenDropdownId(null);
                    setSearchTerm('');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdownId]);

    const handleCustomerSelect = (event) => {
        const customerId = event.target.value;
        const customer = customers.find((item) => String(item.id) === String(customerId));
        setSelectedCustomerId(customerId);

        if (!customer) {
            setCurrencyCode(DEFAULT_CURRENCY);
            setSelectedCustomerFirstName('');
            setSelectedCustomerLastName('');
            return;
        }

        const billingAddress = customer.billing_address || {};
        const shippingAddress = customer.shipping_address || {};
        const selectedCurrency = normalizeCurrencyCode(customer.currency);

        // Get customer names from attention field, fallback to first_name + last_name
        const defaultCustomerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || customer.company_name || 'Customer';
        const billingCustomerName = billingAddress.attention || defaultCustomerName;
        const shippingCustomerName = shippingAddress.attention || defaultCustomerName;

        // Store the actual customer's first_name and last_name for database
        setSelectedCustomerFirstName(customer.first_name || '');
        setSelectedCustomerLastName(customer.last_name || '');

        setCompanyInfo((prev) => ({
            ...prev,
            company_name: prev.company_name || customer.company_name || '',
            company_address: prev.company_address || billingAddress.address || '',
            company_gst_number: prev.company_gst_number || customer.pan || '',
        }));
        setBillingTo({
            customer_name: billingCustomerName,
            company_name: customer.company_name || '',
            address: billingAddress.address || '',
            email: billingAddress.email || customer.email || '',
            phone: sanitizePhoneValue(billingAddress.phone || customer.phone || ''),
        });
        setShippingTo({
            customer_name: shippingCustomerName,
            company_name: customer.company_name || '',
            address: shippingAddress.address || billingAddress.address || '',
            email: shippingAddress.email || billingAddress.email || customer.email || '',
            phone: sanitizePhoneValue(shippingAddress.phone || billingAddress.phone || customer.phone || ''),
        });
        setCurrencyCode(selectedCurrency);
    };

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
                return { ...item, [field]: value };
            });

            // Find the active item that was just updated
            const activeItem = updatedItems.find((item) => item.id === id);
            const isLastRow = updatedItems.at(-1)?.id === id;

            // Check if the last row is complete (name, qty, rate are filled - discount is optional)
            const lastRow = updatedItems.at(-1);
            const isLastRowComplete = lastRow && isItemRowComplete(lastRow);

            // Add new row if the last row is complete and it's the one being edited or already complete
            if (isLastRow && isLastRowComplete) {
                // Check if there's already an empty row at the end
                const hasEmptyRow = updatedItems.some((item) => !item.name?.trim() && item.qty === 1 && item.rate === 0);
                if (!hasEmptyRow) {
                    return [...updatedItems, emptyItem()];
                }
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
            // Don't remove the last row if it's the only one with data
            const filtered = prev.filter((item) => item.id !== id);
            // If all items are removed, add an empty one
            if (filtered.length === 0) {
                return [emptyItem()];
            }
            return filtered;
        });
    };

    const toggleDropdown = (rowId) => {
        if (openDropdownId === rowId) {
            setOpenDropdownId(null);
            setSearchTerm('');
        } else {
            setOpenDropdownId(rowId);
            setSearchTerm('');
        }
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
            customer_first_name: selectedCustomerFirstName,
            customer_last_name: selectedCustomerLastName,
            currency: currencyCode,
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
                headers: { 'Content-Type': 'application/json' },
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

    // Get filtered items for dropdown based on search term
    const getFilteredItems = (currentItemId) => {
        const usedItemIds = new Set(
            items
                .filter((row) => row.id !== currentItemId && row.item_id)
                .map((row) => String(row.item_id))
        );

        return itemCatalog
            .filter((catalogItem) => !usedItemIds.has(String(catalogItem.id)))
            .filter((catalogItem) =>
                catalogItem.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
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
                        <label className="text-sm font-medium text-slate-700">Select customer</label>
                        <select
                            value={selectedCustomerId}
                            onChange={handleCustomerSelect}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                        >
                            <option value="">Choose a customer</option>
                            {customers.map((customer) => {
                                const customerDisplayName = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || customer.company_name || 'Customer';
                                return (
                                    <option key={customer.id} value={customer.id}>
                                        {customerDisplayName} {customer.company_name ? `- ${customer.company_name}` : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Company name</label>
                        <input
                            value={companyInfo.company_name}
                            onChange={(event) => setCompanyInfo((prev) => ({ ...prev, company_name: event.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                            placeholder="Acme Pvt Ltd"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Currency</label>
                        <input
                            value={currencyCode}
                            readOnly
                            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-900 outline-none"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Company address</label>
                        <input
                            onChange={(event) => setCompanyInfo((prev) => ({ ...prev, company_address: event.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                            placeholder="Enter your company address"
                            required
                        />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                        <label className="text-sm font-medium text-slate-700">Company GST Number</label>
                        <input
                            value={companyInfo.company_gst_number}
                            onChange={(event) => setCompanyInfo((prev) => ({ ...prev, company_gst_number: event.target.value }))}
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
                                onChange={(event) => setBillingTo((prev) => ({ ...prev, customer_name: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Enter your name"
                            />
                            <input
                                required
                                value={billingTo.company_name}
                                onChange={(event) => setBillingTo((prev) => ({ ...prev, company_name: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Company name"
                            />
                            <textarea
                                required
                                value={billingTo.address}
                                onChange={(event) => setBillingTo((prev) => ({ ...prev, address: event.target.value }))}
                                className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Billing address"
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <input
                                    type='email'
                                    required
                                    value={billingTo.email}
                                    onChange={(event) => setBillingTo((prev) => ({ ...prev, email: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                    placeholder="Email"
                                />
                                <input
                                    type='tel'
                                    required
                                    inputMode="numeric"
                                    value={billingTo.phone}
                                    onChange={(event) => setBillingTo((prev) => ({ ...prev, phone: sanitizePhoneValue(event.target.value) }))}
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
                                onChange={(event) => setShippingTo((prev) => ({ ...prev, customer_name: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Customer name"
                            />
                            <input
                                required
                                value={shippingTo.company_name}
                                onChange={(event) => setShippingTo((prev) => ({ ...prev, company_name: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Company name"
                            />
                            <textarea
                                required
                                value={shippingTo.address}
                                onChange={(event) => setShippingTo((prev) => ({ ...prev, address: event.target.value }))}
                                className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                placeholder="Shipping address"
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <input
                                    type='email'
                                    required
                                    value={shippingTo.email}
                                    onChange={(event) => setShippingTo((prev) => ({ ...prev, email: event.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                                    placeholder="Email"
                                />
                                <input
                                    type='tel'
                                    required
                                    inputMode="numeric"
                                    value={shippingTo.phone}
                                    onChange={(event) => setShippingTo((prev) => ({ ...prev, phone: sanitizePhoneValue(event.target.value) }))}
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

                    <div className="overflow-visible">
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
                                    const filteredItems = getFilteredItems(item.id);
                                    const isOpen = openDropdownId === item.id;
                                    const isLastRow = items[items.length - 1]?.id === item.id;
                                    const isComplete = isItemRowComplete(item);

                                    return (
                                        <tr key={item.id} className="align-top">
                                            <td className="py-3 pr-3 relative">
                                                <div className="relative" ref={(el) => (dropdownRefs.current[item.id] = el)}>
                                                    <textarea
                                                        rows={2}
                                                        value={item.name}
                                                        onClick={() => toggleDropdown(item.id)}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            // Update the item name
                                                            setItems((prev) => prev.map((row) => {
                                                                if (row.id !== item.id) return row;
                                                                // Check if the typed value matches any catalog item
                                                                const matchedItem = itemCatalog.find((catalogItem) =>
                                                                    String(catalogItem.name || '').trim().toLowerCase() === String(value || '').trim().toLowerCase()
                                                                );
                                                                if (matchedItem) {
                                                                    return {
                                                                        ...row,
                                                                        item_id: String(matchedItem.id),
                                                                        name: matchedItem.name || '',
                                                                        rate: Number(matchedItem.price || 0),
                                                                    };
                                                                }
                                                                return { ...row, name: value, item_id: '' };
                                                            }));

                                                            // Check if the current row is complete after update
                                                            setTimeout(() => {
                                                                setItems((prev) => {
                                                                    const currentItem = prev.find((r) => r.id === item.id);
                                                                    const isLast = prev[prev.length - 1]?.id === item.id;

                                                                    if (isLast && currentItem && isItemRowComplete(currentItem)) {
                                                                        const hasEmptyRow = prev.some((r) => !r.name?.trim() && r.qty === 1 && r.rate === 0);
                                                                        if (!hasEmptyRow) {
                                                                            return [...prev, emptyItem()];
                                                                        }
                                                                    }
                                                                    return prev;
                                                                });
                                                            }, 0);
                                                        }}
                                                        placeholder="Click to select an item or type manually..."
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 resize-y"
                                                    />

                                                    {isOpen && (
                                                        <div className="absolute z-50 left-0 right-0 mt-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg" style={{ maxHeight: '200px', minWidth: '300px' }}>
                                                            <div className="sticky top-0 bg-white p-2 border-b border-slate-200">
                                                                <input
                                                                    type="text"
                                                                    value={searchTerm}
                                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                                    placeholder="Search items..."
                                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                            {filteredItems.length > 0 ? (
                                                                <ul className="py-1">
                                                                    {filteredItems.map((catalogItem) => (
                                                                        <li
                                                                            key={catalogItem.id}
                                                                            onClick={() => {
                                                                                setItems((prev) => {
                                                                                    const updated = prev.map((row) => {
                                                                                        if (row.id !== item.id) return row;
                                                                                        return {
                                                                                            ...row,
                                                                                            item_id: String(catalogItem.id),
                                                                                            name: catalogItem.name || '',
                                                                                            rate: Number(catalogItem.price || 0),
                                                                                        };
                                                                                    });

                                                                                    // Check if we need to add a new row
                                                                                    const updatedItem = updated.find((r) => r.id === item.id);
                                                                                    const isLast = updated[updated.length - 1]?.id === item.id;

                                                                                    if (isLast && updatedItem && isItemRowComplete(updatedItem)) {
                                                                                        const hasEmptyRow = updated.some((r) => !r.name?.trim() && r.qty === 1 && r.rate === 0);
                                                                                        if (!hasEmptyRow) {
                                                                                            return [...updated, emptyItem()];
                                                                                        }
                                                                                    }
                                                                                    return updated;
                                                                                });
                                                                                setOpenDropdownId(null);
                                                                                setSearchTerm('');
                                                                            }}
                                                                            className="flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-blue-50"
                                                                        >
                                                                            <span className="text-slate-900">{catalogItem.name}</span>
                                                                            <span className="text-sm text-slate-500">
                                                                                {Number(catalogItem.price || 0).toFixed(2)}
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <div className="px-4 py-3 text-sm text-slate-500">
                                                                    {searchTerm ? 'No items found' : 'No items available'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.qty}
                                                    onChange={(event) => {
                                                        const value = event.target.value;
                                                        updateItem(item.id, 'qty', value);
                                                    }}
                                                    className="w-[76px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-slate-900 outline-none transition focus:border-blue-500"
                                                />
                                            </td>
                                            <td className="py-3 pr-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.rate}
                                                    onChange={(event) => {
                                                        const value = event.target.value;
                                                        updateItem(item.id, 'rate', value);
                                                    }}
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
                                                        onChange={(event) => {
                                                            const value = event.target.value;
                                                            updateItem(item.id, 'discount', value);
                                                        }}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-slate-900 outline-none transition focus:border-blue-500"
                                                    />
                                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">%</span>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <div className="flex w-[110px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right font-semibold text-slate-800">
                                                    {amount.toFixed(2)}
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
                                <span>Currency</span>
                                <span className="font-semibold text-slate-900">{currencyCode}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-600">
                                <span>Sub Total</span>
                                <span className="font-semibold text-slate-900">{formatCurrencyValue(subtotal, currencyCode)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-600">
                                <span>Discount</span>
                                <span className="font-semibold text-slate-900">{formatCurrencyValue(discountAmount, currencyCode)}</span>
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
                                <span className="font-semibold text-slate-900">{formatCurrencyValue(gstAmount, currencyCode)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                                <span>Grand Total</span>
                                <span>{formatCurrencyValue(grandTotal, currencyCode)}</span>
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