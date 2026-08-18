"use client";

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { X, Plus, Trash2 } from 'lucide-react';

const createEmptyContact = () => ({
  id: Date.now() + Math.random(),
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
});

const initialBillingAddress = {
  attention: '',
  address: '',
  city: '',
  pin_code: '',
  email: '',
  phone: '',
};

const initialShippingAddress = {
  attention: '',
  address: '',
  city: '',
  pin_code: '',
  email: '',
  phone: '',
};

export default function CustomerModal({ isOpen, onClose, customer, mode = 'add', onCustomerAdded, onCustomerUpdated }) {
  const [customerType, setCustomerType] = useState('Business');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [billingAddress, setBillingAddress] = useState(initialBillingAddress);
  const [shippingAddress, setShippingAddress] = useState(initialShippingAddress);
  const [contactPersons, setContactPersons] = useState([createEmptyContact()]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('other');
  const [currencyOptions, setCurrencyOptions] = useState([]);

  const tabs = ['other', 'address', 'contact', 'remarks'];

  useEffect(() => {
    let isMounted = true;

    const fetchCurrencies = async () => {
      try {
        const response = await fetch('/api/currencies');
        if (!response.ok) {
          throw new Error('Failed to load currencies');
        }

        const result = await response.json();
        const currencies = Array.isArray(result?.data) ? result.data : [];

        if (isMounted) setCurrencyOptions(currencies);
      } catch (error) {
        console.error('Currency fetch error:', error);

        if (isMounted) {
          setCurrencyOptions([]);
        }
      }
    };

    fetchCurrencies();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && customer) {
      setCustomerType(customer.customer_type || 'Business');
      setFirstName(customer.first_name || '');
      setLastName(customer.last_name || '');
      setCompanyName(customer.company_name || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setPan(customer.pan || '');
      setCurrency(customer.currency || 'INR');
      setPaymentTerms(customer.payment_terms || '');
      setRemarks(customer.remarks || '');
      setBillingAddress({
        ...initialBillingAddress,
        ...(customer.billing_address || {}),
        email: customer.billing_address?.email || '',
      });
      setShippingAddress({
        ...initialShippingAddress,
        ...(customer.shipping_address || {}),
        email: customer.shipping_address?.email || '',
      });
      setContactPersons(Array.isArray(customer.contact_persons) && customer.contact_persons.length ? customer.contact_persons.map((person) => ({ ...person, id: person.id || Date.now() + Math.random() })) : [createEmptyContact()]);
    } else {
      setCustomerType('Business');
      setFirstName('');
      setLastName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setPan('');
      setCurrency('INR');
      setPaymentTerms('');
      setRemarks('');
      setBillingAddress({ ...initialBillingAddress, email: '' });
      setShippingAddress({ ...initialShippingAddress, email: '' });
      setContactPersons([createEmptyContact()]);
    }
  }, [isOpen, customer, mode]);

  const totalContactPersons = useMemo(() => contactPersons.filter((person) => person.first_name || person.last_name || person.email || person.phone).length, [contactPersons]);
  const availableCurrencies = useMemo(() => {
    if (!currencyOptions.length) {
      return [{ code: currency || 'INR', name: currency || 'INR' }];
    }

    const hasCurrentCurrency = currencyOptions.some((option) => option.code === currency);
    if (!hasCurrentCurrency && currency) {
      return [{ code: currency, name: currency }, ...currencyOptions];
    }

    return currencyOptions;
  }, [currency, currencyOptions]);

  const addContactPerson = () => setContactPersons((prev) => [...prev, createEmptyContact()]);

  const removeContactPerson = (id) => {
    setContactPersons((prev) => {
      if (prev.length === 1) return [createEmptyContact()];
      return prev.filter((person) => person.id !== id);
    });
  };

  const updateContactPerson = (id, field, value) => {
    setContactPersons((prev) => prev.map((person) => (person.id === id ? { ...person, [field]: value } : person)));
  };

  const hasAddressData = (address) => Object.values(address || {}).some((value) => String(value ?? '').trim() !== '');
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());

  const updateBillingAddress = (field, value) => setBillingAddress((prev) => ({ ...prev, [field]: value ?? '' }));
  const updateShippingAddress = (field, value) => setShippingAddress((prev) => ({ ...prev, [field]: value ?? '' }));

  const resetForm = () => {
    setCustomerType('Business');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setPan('');
    setCurrency('INR');
    setPaymentTerms('');
    setRemarks('');
    setBillingAddress(initialBillingAddress);
    setShippingAddress(initialShippingAddress);
    setContactPersons([createEmptyContact()]);
    setActiveTab('other');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!firstName.trim() && !lastName.trim() && !companyName.trim()) {
      toast.error('Please enter at least a customer name or company name.');
      return;
    }

    if (hasAddressData(billingAddress)) {
      if (!billingAddress.email?.trim()) {
        toast.error('Billing email is required when billing address is filled.');
        setActiveTab('address');
        return;
      }

      if (!isValidEmail(billingAddress.email)) {
        toast.error('Please enter a valid billing email address.');
        setActiveTab('address');
        return;
      }
    }

    if (hasAddressData(shippingAddress)) {
      if (!shippingAddress.email?.trim()) {
        toast.error('Shipping email is required when shipping address is filled.');
        setActiveTab('address');
        return;
      }

      if (!isValidEmail(shippingAddress.email)) {
        toast.error('Please enter a valid shipping email address.');
        setActiveTab('address');
        return;
      }
    }

    const payload = {
      customer_type: customerType,
      first_name: firstName,
      last_name: lastName,
      company_name: companyName,
      email,
      phone,
      pan,
      currency,
      payment_terms: paymentTerms,
      billing_address: billingAddress,
      shipping_address: shippingAddress,
      contact_persons: contactPersons.filter((person) => person.first_name || person.last_name || person.email || person.phone),
      remarks,
    };

    try {
      setLoading(true);
      const url = mode === 'edit' && customer?.id ? `/api/customers/${customer.id}` : '/api/customers';
      const method = mode === 'edit' && customer?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save customer');
      }

      if (mode === 'add') {
        onCustomerAdded?.(result.data);
      } else {
        onCustomerUpdated?.(result.data);
      }

      toast.success(mode === 'add' ? 'Customer added successfully.' : 'Customer updated successfully.');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Customer save error:', error);
      toast.error(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full font-sans rounded-[20px] border border-slate-200 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="px-6 pt-5">
        <p className="text-[33px] font-medium leading-none tracking-[-0.04em] text-slate-900">
          {mode === 'add' ? 'New Customer' : 'Edit Customer'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 pb-8 pt-10">
        <div className="space-y-5">
          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Customer Type</label>
            <div className="flex items-center gap-8">
              {['Business', 'Individual'].map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2 text-[15px] text-slate-700">
                  <input
                    type="radio"
                    name="customerType"
                    checked={customerType === type}
                    onChange={() => setCustomerType(type)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Primary Contact</label>
            <div className="grid max-w-[620px] grid-cols-2 gap-3">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="First Name" />
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="Last Name" />
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="max-w-[620px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="Company Name" />
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Email Address</label>
            <div className="flex max-w-[620px] items-center gap-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="Email Address" />
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-4">
            <label className="pt-2 text-[15px] font-medium text-slate-700">Phone</label>
            <div className="max-w-[620px]">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl w-full border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="Work Phone" />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200">
          <div className="mt-4 flex gap-8 border-b border-slate-200 pb-2 text-[15px] text-slate-500">
            {['Other Details', 'Address', 'Contact Persons', 'Remarks'].map((tabName, index) => (
              <button
                key={tabName}
                type="button"
                onClick={() => setActiveTab(index === 0 ? 'other' : index === 1 ? 'address' : index === 2 ? 'contact' : index === 3 ? 'remarks' : 'remarks')}
                className={`pb-2 ${activeTab === (index === 0 ? 'other' : index === 1 ? 'address' : index === 2 ? 'contact' : index === 3 ? 'remarks' : 'remarks') ? 'border-b-2 border-blue-600 font-medium text-blue-600' : ''}`}
              >
                {tabName}
              </button>
            ))}
          </div>

          <div className="pt-6">
            {activeTab === 'other' && (
              <div className="space-y-5">
                <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[15px] font-medium text-slate-700">PAN</label>
                  <input value={pan} onChange={(e) => setPan(e.target.value)} className="max-w-[620px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-blue-500" placeholder="PAN" />
                </div>

                <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[15px] font-medium text-slate-700">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="max-w-[220px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500"
                    disabled={!availableCurrencies.length}
                  >
                    {availableCurrencies.map(({ code, name }) => (
                      <option key={code} value={code}>
                        {code} - {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[15px] font-medium text-slate-700">Payment Terms</label>
                  <textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="max-w-[620px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-blue-500" placeholder="Payment Terms" />
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Billing Address</h4>
                  <div className="space-y-3">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Attention</label>
                    <input value={billingAddress.attention} onChange={(e) => updateBillingAddress('attention', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Attention" />

                    <label className="mb-1 block text-xs font-medium text-slate-700">Address</label>
                    <textarea value={billingAddress.address} onChange={(e) => updateBillingAddress('address', e.target.value)} className="min-h-[90px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Address" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">City</label>
                        <input value={billingAddress.city} onChange={(e) => updateBillingAddress('city', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="City" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Pin Code</label>
                        <input value={billingAddress.pin_code} onChange={(e) => updateBillingAddress('pin_code', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Pin Code" />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                        <input type="email" value={billingAddress.email} onChange={(e) => updateBillingAddress('email', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Email" required={hasAddressData(billingAddress)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Phone</label>
                        <input value={billingAddress.phone} onChange={(e) => updateBillingAddress('phone', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Phone" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Shipping Address</h4>
                  <div className="space-y-3">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Attention</label>
                    <input value={shippingAddress.attention} onChange={(e) => updateShippingAddress('attention', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Attention" />
                    <label className="mb-1 block text-xs font-medium text-slate-700">Address</label>
                    <textarea value={shippingAddress.address} onChange={(e) => updateShippingAddress('address', e.target.value)} className="min-h-[90px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Address" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">City</label>
                        <input value={shippingAddress.city} onChange={(e) => updateShippingAddress('city', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="City" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Pin Code</label>
                        <input value={shippingAddress.pin_code} onChange={(e) => updateShippingAddress('pin_code', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Pin Code" />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                        <input type="email" value={shippingAddress.email} onChange={(e) => updateShippingAddress('email', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Email" required={hasAddressData(shippingAddress)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Phone</label>
                        <input value={shippingAddress.phone} onChange={(e) => updateShippingAddress('phone', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Phone" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="rounded-xl space-y-4 border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Persons</p>
                <div className="space-y-4">
                  {contactPersons.map((person, index) => (
                    <div key={person.id} className="flex items-center gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">First Name</label>
                        <input value={person.first_name} onChange={(e) => updateContactPerson(person.id, 'first_name', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="First Name" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Last Name</label>
                        <input value={person.last_name} onChange={(e) => updateContactPerson(person.id, 'last_name', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Last Name" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input value={person.email} onChange={(e) => updateContactPerson(person.id, 'email', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Email Address" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Phone</label>
                        <input value={person.phone} onChange={(e) => updateContactPerson(person.id, 'phone', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Phone Number" />
                      </div>
                      <button type="button" onClick={() => removeContactPerson(person.id)} className="rounded-md p-2 mt-5 text-red-500 transition hover:bg-red-50">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addContactPerson} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                  <Plus size={16} />
                  Add Person
                </button>
              </div>
            )}

            {activeTab === 'remarks' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Notes" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
