'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileCheck2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';

const emptyItem = () => ({
    id: `${Date.now()}-${Math.random()}`,
    item_id: '',
    name: '',
    qty: 1,
    rate: 0,
    discount: 0,
});

const emptyCustomer = {
    customer_name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
};

const amountFor = (item) =>
    Number(item.qty || 0) * Number(item.rate || 0) * (1 - Number(item.discount || 0) / 100);

const numberValue = (value) => Number(value || 0);

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const isItemComplete = (item) =>
    Boolean(item.name?.trim()) && numberValue(item.qty) > 0 && numberValue(item.rate) > 0;

const currency = (value) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numberValue(value));

export default function QuotationForm({ quotation, onCancel, onSaved }) {
    const [customers, setCustomers] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [company, setCompany] = useState({
        company_name: '',
        company_address: '',
        company_gst_number: '',
        currency: 'INR',
    });
    const [customer, setCustomer] = useState(emptyCustomer);
    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState([emptyItem()]);
    const [gstRate, setGstRate] = useState(18);
    const [terms, setTerms] = useState('This quotation is valid for 15 days.');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [openProductId, setOpenProductId] = useState(null);
    const [productSearch, setProductSearch] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const dropdownRefs = useRef({});

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [customerResponse, itemResponse] = await Promise.all([
                    fetch('/api/customers'),
                    fetch('/api/items?status=Active&limit=1000'),
                ]);
                const customerResult = await customerResponse.json();
                const itemResult = await itemResponse.json();
                setCustomers(customerResult?.success ? customerResult.data || [] : []);
                setCatalog(itemResult?.success ? itemResult.data || [] : []);
            } catch (error) {
                console.error('Failed to load quotation options:', error);
            }
        };
        loadOptions();

        try {
            const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
            if (user) {
                setCompany((current) => ({
                    ...current,
                    company_name: user.organizationName || user.companyName || current.company_name,
                    company_gst_number: user.gstNumber || current.company_gst_number,
                }));
            }
        } catch (error) {
            console.error('Failed to load company details:', error);
        }
    }, []);

    useEffect(() => {
        if (!quotation) return;
        setCompany(quotation.company_info || {});
        setCustomer(
            quotation.customer_info || {
                ...emptyCustomer,
                customer_name: quotation.customer_name || '',
            }
        );
        setCustomerId(quotation.customer_id ? String(quotation.customer_id) : '');
        setItems(
            quotation.items?.length
                ? quotation.items.map((item) => ({
                    ...item,
                    id: `${item.item_id || item.name}-${Math.random()}`,
                }))
                : [emptyItem()]
        );
        setGstRate(numberValue(quotation.gst_rate));
        setTerms(quotation.terms || '');
    }, [quotation]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                openProductId &&
                dropdownRefs.current[openProductId] &&
                !dropdownRefs.current[openProductId].contains(event.target)
            ) {
                setOpenProductId(null);
                setProductSearch('');
            }
            if (
                isCustomerDropdownOpen &&
                dropdownRefs.current.customer &&
                !dropdownRefs.current.customer.contains(event.target)
            ) {
                setIsCustomerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [openProductId, isCustomerDropdownOpen]);

    const totals = useMemo(() => {
        const subtotal = items.reduce(
            (sum, item) => sum + numberValue(item.qty) * numberValue(item.rate),
            0
        );
        const discountAmount = items.reduce(
            (sum, item) =>
                sum + (numberValue(item.qty) * numberValue(item.rate) * numberValue(item.discount)) / 100,
            0
        );
        const taxAmount = ((subtotal - discountAmount) * numberValue(gstRate)) / 100;
        return {
            subtotal,
            discountAmount,
            taxAmount,
            grandTotal: subtotal - discountAmount + taxAmount,
        };
    }, [items, gstRate]);

    const selectCustomer = (event) => {
        const id = event.target.value;
        setCustomerId(id);
        const selected = customers.find((item) => String(item.id) === id);
        if (!selected) return;
        const address = selected.billing_address || {};
        setCustomer({
            customer_name:
                selected.customer_name ||
                [selected.first_name, selected.last_name].filter(Boolean).join(' ') ||
                selected.company_name ||
                '',
            company_name: selected.company_name || '',
            email: selected.email || '',
            phone: selected.phone || '',
            address: address.address || '',
        });
        setIsCustomerDropdownOpen(false);
    };

    const updateCustomerName = (value) => {
        setCustomerId('');
        setCustomer((current) => ({ ...current, customer_name: value }));
        setIsCustomerDropdownOpen(true);
    };

    const updateItem = (id, field, value) => {
        setItems((current) => {
            const updatedItems = current.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            );
            const updatedIndex = updatedItems.findIndex((item) => item.id === id);
            const isLastItem = updatedIndex === updatedItems.length - 1;
            const hasEmptyRow = updatedItems.some((item) => !item.name?.trim() && numberValue(item.rate) === 0);

            if (isLastItem && isItemComplete(updatedItems[updatedIndex]) && !hasEmptyRow) {
                return [...updatedItems, emptyItem()];
            }

            return updatedItems;
        });
    };

    const selectItem = (id, value) => {
        const selected = catalog.find((item) => String(item.id) === value);
        setItems((current) =>
            (() => {
                const updatedItems = current.map((item) =>
                    item.id === id
                        ? {
                            ...item,
                            item_id: value,
                            name: selected?.name || item.name,
                            rate: selected?.price || item.rate,
                        }
                        : item
                );
                const updatedIndex = updatedItems.findIndex((item) => item.id === id);
                const isLastItem = updatedIndex === updatedItems.length - 1;
                const hasEmptyRow = updatedItems.some((item) => !item.name?.trim() && numberValue(item.rate) === 0);

                return isLastItem && isItemComplete(updatedItems[updatedIndex]) && !hasEmptyRow
                    ? [...updatedItems, emptyItem()]
                    : updatedItems;
            })()
        );
    };

    const filteredCustomers = customers.filter((item) => {
        const name =
            item.customer_name ||
            [item.first_name, item.last_name].filter(Boolean).join(' ') ||
            item.company_name ||
            '';
        return name.toLowerCase().includes(customer.customer_name.toLowerCase());
    });

    const selectedProductIds = new Set(
        items
            .filter((item) => item.id !== openProductId && item.item_id)
            .map((item) => String(item.item_id))
    );

    const filteredProducts = catalog.filter(
        (item) =>
            !selectedProductIds.has(String(item.id)) &&
            item.name?.toLowerCase().includes(productSearch.toLowerCase())
    );

    const chooseCustomer = (selected) => {
        const address = selected.billing_address || {};
        setCustomerId(String(selected.id));
        setCustomer({
            customer_name:
                selected.customer_name ||
                [selected.first_name, selected.last_name].filter(Boolean).join(' ') ||
                selected.company_name ||
                '',
            company_name: selected.company_name || '',
            email: selected.email || '',
            phone: selected.phone || '',
            address: address.address || '',
        });
        setIsCustomerDropdownOpen(false);
    };

    const submit = async (event) => {
        event.preventDefault();
        const validItems = items.filter((item) => item.name.trim());
        const nextErrors = {};

        if (!company.company_name?.trim()) nextErrors.companyName = 'Company name is required.';
        if (!company.company_address?.trim()) nextErrors.companyAddress = 'Company address is required.';
        if (!customer.customer_name?.trim()) nextErrors.customerName = 'Customer name is required.';
        if (customer.email?.trim() && !isValidEmail(customer.email)) {
            nextErrors.customerEmail = 'Enter a valid email address.';
        }
        if (!validItems.length) nextErrors.items = 'Add at least one product.';

        items.forEach((item) => {
            const isEmptyAutoRow = !item.name?.trim() && numberValue(item.qty) === 1 && numberValue(item.rate) === 0;
            if (isEmptyAutoRow) return;
            if (!item.name?.trim()) nextErrors[`itemName_${item.id}`] = 'Product name is required.';
            if (item.name?.trim() && numberValue(item.qty) <= 0) {
                nextErrors[`itemQty_${item.id}`] = 'Qty must be greater than 0.';
            }
            if (item.name?.trim() && numberValue(item.rate) <= 0) {
                nextErrors[`itemRate_${item.id}`] = 'Rate must be greater than 0.';
            }
        });

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            toast.error('Please fix the required fields.');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                customerId: customerId || null,
                customerName: customer.customer_name.trim(),
                customerInfo: customer,
                companyInfo: company,
                currency: company.currency || 'INR',
                items: validItems.map(({ id, ...item }) => ({
                    ...item,
                    qty: numberValue(item.qty),
                    rate: numberValue(item.rate),
                    discount: numberValue(item.discount),
                })),
                gstRate: numberValue(gstRate),
                terms,
            };
            const response = await fetch(
                quotation ? `/api/quotations/${quotation.id}` : '/api/quotations',
                {
                    method: quotation ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );
            const result = await response.json();
            if (!response.ok || !result?.success) throw new Error(result?.message || 'Unable to save quotation');
            toast.success(quotation ? 'Quotation updated successfully.' : 'Quotation created successfully.');
            onSaved(result.data);
        } catch (error) {
            console.error('Save quotation error:', error);
            toast.error(error.message || 'Failed to save quotation.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-[28px] font-sans border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                        <FileCheck2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                            {quotation ? 'Edit' : 'Create'}
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {quotation ? 'Edit Quotation' : 'New Quotation'}
                        </h2>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <X className="h-4 w-4" /> Close
                </button>
            </div>

            <form noValidate onSubmit={submit} className="space-y-8">
                {/* Quotation Details */}
                <section className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-3">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                            Quotation details
                        </h3>
                    </div>
                    <div
                        className="relative space-y-2 text-sm font-medium text-slate-700"
                        ref={(element) => (dropdownRefs.current.customer = element)}
                    >
                        <label htmlFor="quotation-customer-search">Select customer or type manually</label>
                        <div>
                            <input
                                id="quotation-customer-search"
                                value={customer.customer_name}
                                onFocus={() => setIsCustomerDropdownOpen(true)}
                                onChange={(event) => updateCustomerName(event.target.value)}
                                className="w-full rounded-xl mt-0.75 border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:bg-white"
                                placeholder="Search customer or type a name"
                            />
                            {errors.customerName && <p className="text-xs pt-1 font-medium text-red-500">{errors.customerName}</p>}
                        </div>
                        {isCustomerDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-100 mt-1 max-h-56 min-w-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl">
                                {filteredCustomers.length ? (
                                    filteredCustomers.map((item) => (
                                        <button
                                            type="button"
                                            key={item.id}
                                            onClick={() => chooseCustomer(item)}
                                            className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50"
                                        >
                                            <span className="font-medium text-slate-800">
                                                {item.customer_name || item.company_name || 'Customer'}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {item.company_name || item.email || ''}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-4 py-3 text-sm text-slate-500">
                                        No saved customer found. Your typed name will be used.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                        Company name
                        <div>
                            <input
                                value={company.company_name || ''}
                                onChange={(event) => setCompany({ ...company, company_name: event.target.value })}
                                className="w-full mt-0.75 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                                placeholder="Your company"
                                required
                            />
                            {errors.companyName && <p className="text-xs pt-1 font-medium text-red-500">{errors.companyName}</p>}
                        </div>
                    </label>
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                        Currency
                        <input
                            value={company.currency || 'INR'}
                            onChange={(event) =>
                                setCompany({ ...company, currency: event.target.value.toUpperCase() })
                            }
                            className="w-full mt-0.75 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                            maxLength={3}
                        />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                        Company address
                        <div>
                            <input
                                value={company.company_address || ''}
                                onChange={(event) =>
                                    setCompany({ ...company, company_address: event.target.value })
                                }
                                className="w-full mt-0.75 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                                placeholder="Company address"
                            />
                            {errors.companyAddress && <p className="text-xs pt-1 font-medium text-red-500">{errors.companyAddress}</p>}
                        </div>
                    </label>
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                        GST number
                        <input
                            value={company.company_gst_number || ''}
                            onChange={(event) =>
                                setCompany({ ...company, company_gst_number: event.target.value })
                            }
                            className="w-full mt-0.75 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                            placeholder="Optional"
                        />
                    </label>
                </section>

                {/* Customer */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                        Customer
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Customer name
                            <input
                                value={customer.customer_name}
                                onChange={(event) => updateCustomerName(event.target.value)}
                                className="w-full mt-0.75 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                                placeholder="Enter customer name"
                                required
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Company name
                            <input
                                value={customer.company_name}
                                onChange={(event) =>
                                    setCustomer({ ...customer, company_name: event.target.value })
                                }
                                className="w-full mt-0.75 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                                placeholder="Optional"
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Email
                            <input
                                type="email"
                                value={customer.email}
                                onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
                                className="w-full mt-0.75 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                                placeholder="Optional"
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Phone
                            <input
                                value={customer.phone}
                                onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                                className="w-full mt-0.75 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                                placeholder="Optional"
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                            Address
                            <input
                                value={customer.address}
                                onChange={(event) => setCustomer({ ...customer, address: event.target.value })}
                                className="w-full mt-0.75 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                                placeholder="Optional"
                            />
                        </label>
                    </div>
                </section>

                {/* Products */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Products
                        </h3>
                        <button
                            type="button"
                            onClick={() => setItems([...items, emptyItem()])}
                            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                        >
                            <Plus className="h-4 w-4" /> Add product
                        </button>
                    </div>
                    <div className="overflow-visible rounded-2xl border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">Qty</th>
                                    <th className="px-4 py-3">Rate</th>
                                    <th className="px-4 py-3">Discount %</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} className="border-t border-slate-200">
                                        <td
                                            className="relative px-3 py-3"
                                            ref={(element) => (dropdownRefs.current[item.id] = element)}
                                        >
                                            <textarea
                                                rows={2}
                                                value={item.name}
                                                onFocus={() => {
                                                    setOpenProductId(item.id);
                                                    setProductSearch(item.name);
                                                }}
                                                onChange={(event) => {
                                                    updateItem(item.id, 'name', event.target.value);
                                                    updateItem(item.id, 'item_id', '');
                                                    setOpenProductId(item.id);
                                                    setProductSearch(event.target.value);
                                                }}
                                                className={`min-w-64 w-full resize-y rounded-xl border ${errors[`itemName_${item.id}`] ? 'border-red-500' : 'border-slate-200'} px-3 py-2 outline-none focus:border-blue-500`}
                                                placeholder="Click to select or type product manually..."
                                            />
                                            {errors[`itemName_${item.id}`] && <p className="mt-1 text-xs font-medium text-red-500">{errors[`itemName_${item.id}`]}</p>}
                                            {openProductId === item.id && (
                                                <div className="absolute left-3 right-3 top-full z-100 mt-1 max-h-56 min-w-72 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
                                                    <div className="sticky top-0 border-b border-slate-200 bg-white p-2">
                                                        <input
                                                            value={productSearch}
                                                            onChange={(event) => setProductSearch(event.target.value)}
                                                            onClick={(event) => event.stopPropagation()}
                                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                                            placeholder="Search products..."
                                                        />
                                                    </div>
                                                    {filteredProducts.length ? (
                                                        filteredProducts.map((catalogItem) => (
                                                            <button
                                                                type="button"
                                                                key={catalogItem.id}
                                                                onClick={() => {
                                                                    selectItem(item.id, String(catalogItem.id));
                                                                    setOpenProductId(null);
                                                                    setProductSearch('');
                                                                }}
                                                                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50"
                                                            >
                                                                <span className="text-slate-800">{catalogItem.name}</span>
                                                                <span className="text-xs text-slate-500">
                                                                    {currency(catalogItem.price)}
                                                                </span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="px-4 py-3 text-sm text-slate-500">
                                                            No product found. Your typed product will be used.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.qty}
                                                onChange={(event) => updateItem(item.id, 'qty', event.target.value)}
                                                className={`w-20 rounded-lg border ${errors[`itemQty_${item.id}`] ? 'border-red-500' : 'border-slate-200'} px-2 py-2 outline-none`}
                                            />
                                            {errors[`itemQty_${item.id}`] && <p className="mt-1 text-xs font-medium text-red-500">{errors[`itemQty_${item.id}`]}</p>}
                                        </td>
                                        <td className="px-3 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.rate}
                                                onChange={(event) => updateItem(item.id, 'rate', event.target.value)}
                                                className={`w-28 rounded-lg border ${errors[`itemRate_${item.id}`] ? 'border-red-500' : 'border-slate-200'} px-2 py-2 outline-none`}
                                            />
                                            {errors[`itemRate_${item.id}`] && <p className="mt-1 text-xs font-medium text-red-500">{errors[`itemRate_${item.id}`]}</p>}
                                        </td>
                                        <td className="px-3 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={item.discount}
                                                onChange={(event) => updateItem(item.id, 'discount', event.target.value)}
                                                className="w-24 rounded-lg border border-slate-200 px-2 py-2 outline-none"
                                            />
                                        </td>
                                        <td className="px-3 py-3 font-semibold text-slate-900">
                                            {currency(amountFor(item))}
                                        </td>
                                        <td className="px-3 py-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setItems(items.length > 1 ? items.filter((row) => row.id !== item.id) : items)
                                                }
                                                className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                                                aria-label="Remove product"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {errors.items && <p className="px-4 pb-3 text-sm font-medium text-red-500">{errors.items}</p>}
                    </div>
                </section>

                {/* Terms and Totals */}
                <section className="grid gap-6 md:grid-cols-[1fr_320px]">
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                        Terms and notes
                        <textarea
                            value={terms}
                            onChange={(event) => setTerms(event.target.value)}
                            className="min-h-32 w-full mt-0.75 rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                        />
                    </label>
                    <div className="rounded-2xl bg-slate-50 p-5 text-sm">
                        <div className="flex justify-between py-2 text-slate-600">
                            <span>Subtotal</span>
                            <span>{currency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-slate-600">
                            <span>Discount</span>
                            <span>- {currency(totals.discountAmount)}</span>
                        </div>
                        <label className="flex items-center justify-between gap-3 border-y border-slate-200 py-3 text-slate-600">
                            GST %
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={gstRate}
                                onChange={(event) => setGstRate(event.target.value)}
                                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right outline-none"
                            />
                        </label>
                        <div className="flex justify-between py-2 text-slate-600">
                            <span>Tax</span>
                            <span>{currency(totals.taxAmount)}</span>
                        </div>
                        <div className="mt-2 flex justify-between border-t border-slate-300 pt-3 text-base font-bold text-slate-900">
                            <span>Total</span>
                            <span>{currency(totals.grandTotal)}</span>
                        </div>
                    </div>
                </section>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : quotation ? 'Update quotation' : 'Create quotation'}
                    </button>
                </div>
            </form>
        </div>
    );
}