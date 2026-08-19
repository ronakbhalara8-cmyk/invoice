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
  const [errors, setErrors] = useState({});

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
    setErrors({});
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
  const isValidPhone = (value) => /^[6-9][0-9]{9}$/.test((value || '').trim());

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
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!firstName.trim() && !lastName.trim()) {
      newErrors.primaryContact = 'Please enter customer name';
    }

    if (!companyName.trim()) {
      newErrors.companyName = 'Please enter company name';
    }

    if (customerType === "Business") {
      if (!email.trim()) {
        newErrors.email = 'Please enter email address';
      } else if (!isValidEmail(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!phone.trim()) {
      newErrors.phone = 'Please enter phone number';
    } else if (!isValidPhone(phone)) {
      newErrors.phone = 'Phone number must be 10 digits starting with 6, 7, 8, or 9';
    }

    const billingHasAnyValue = Object.values(billingAddress).some(
      (val) => String(val ?? '').trim() !== ''
    );

    if (billingHasAnyValue) {
      if (!billingAddress.attention?.trim()) {
        newErrors.billingAttention = 'Billing attention is required';
      }
      if (!billingAddress.address?.trim()) {
        newErrors.billingAddress = 'Billing address is required';
      }
      if (!billingAddress.city?.trim()) {
        newErrors.billingCity = 'Billing city is required';
      }
      if (!billingAddress.pin_code?.trim()) {
        newErrors.billingPin = 'Billing pin code is required';
      } else if (billingAddress.pin_code.trim().length !== 6) {
        newErrors.billingPin = 'Pin code must be exactly 6 digits';
      } else if (!/^[0-9]{6}$/.test(billingAddress.pin_code.trim())) {
        newErrors.billingPin = 'Pin code must be exactly 6 digits';
      }
      if (!billingAddress.email?.trim()) {
        newErrors.billingEmail = 'Billing email is required';
      } else if (!isValidEmail(billingAddress.email)) {
        newErrors.billingEmail = 'Please enter a valid billing email address';
      }
      if (!billingAddress.phone?.trim()) {
        newErrors.billingPhone = 'Billing phone is required';
      } else if (!isValidPhone(billingAddress.phone)) {
        newErrors.billingPhone = 'Phone must be 10 digits starting with 6-9';
      }
    }

    const shippingHasAnyValue = Object.values(shippingAddress).some(
      (val) => String(val ?? '').trim() !== ''
    );

    if (shippingHasAnyValue) {
      if (!shippingAddress.attention?.trim()) {
        newErrors.shippingAttention = 'Shipping attention is required';
      }
      if (!shippingAddress.address?.trim()) {
        newErrors.shippingAddress = 'Shipping address is required';
      }
      if (!shippingAddress.city?.trim()) {
        newErrors.shippingCity = 'Shipping city is required';
      }
      if (!shippingAddress.pin_code?.trim()) {
        newErrors.shippingPin = 'Shipping pin code is required';
      } else if (shippingAddress.pin_code.trim().length !== 6) {
        newErrors.shippingPin = 'Pin code must be exactly 6 digits';
      } else if (!/^[0-9]{6}$/.test(shippingAddress.pin_code.trim())) {
        newErrors.shippingPin = 'Pin code must be exactly 6 digits';
      }
      if (!shippingAddress.email?.trim()) {
        newErrors.shippingEmail = 'Shipping email is required';
      } else if (!isValidEmail(shippingAddress.email)) {
        newErrors.shippingEmail = 'Please enter a valid shipping email address';
      }
      if (!shippingAddress.phone?.trim()) {
        newErrors.shippingPhone = 'Shipping phone is required';
      } else if (!isValidPhone(shippingAddress.phone)) {
        newErrors.shippingPhone = 'Phone must be 10 digits starting with 6-9';
      }
    }

    contactPersons.forEach((person, index) => {
      const hasAnyField =
        (person.first_name?.trim() || '') !== '' ||
        (person.last_name?.trim() || '') !== '' ||
        (person.email?.trim() || '') !== '' ||
        (person.phone?.trim() || '') !== '';

      if (hasAnyField) {
        if (!person.first_name?.trim()) {
          newErrors[`contactFirstName_${index}`] = 'First name is required';
        }
        if (!person.last_name?.trim()) {
          newErrors[`contactLastName_${index}`] = 'Last name is required';
        }
        if (!person.email?.trim()) {
          newErrors[`contactEmail_${index}`] = 'Email is required';
        } else if (!isValidEmail(person.email)) {
          newErrors[`contactEmail_${index}`] = 'Invalid email format';
        }
        if (!person.phone?.trim()) {
          newErrors[`contactPhone_${index}`] = 'Phone is required';
        } else if (!isValidPhone(person.phone)) {
          newErrors[`contactPhone_${index}`] = 'Phone must be 10 digits starting with 6-9';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      if (errors.billingAttention || errors.billingAddress || errors.billingCity || errors.billingPin || errors.billingEmail || errors.billingPhone ||
        errors.shippingAttention || errors.shippingAddress || errors.shippingCity || errors.shippingPin || errors.shippingEmail || errors.shippingPhone) {
        setActiveTab('address');
      } else if (Object.keys(errors).some(key => key.startsWith('contact'))) {
        setActiveTab('contact');
      }
      toast.error('Please fix the validation errors.');
      return;
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

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-4">
            <label className="pt-2 text-[15px] font-medium text-slate-700">Primary Contact</label>
            <div className="max-w-[620px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.primaryContact) setErrors({ ...errors, primaryContact: '' });
                    }}
                    className={`h-[42px] w-full rounded-xl border ${errors.primaryContact ? 'border-red-500' : 'border-slate-300'} bg-white px-3 text-[15px] text-slate-700 outline-none focus:border-blue-500`}
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <input
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (errors.primaryContact) setErrors({ ...errors, primaryContact: '' });
                    }}
                    className={`h-[42px] w-full rounded-xl border ${errors.primaryContact ? 'border-red-500' : 'border-slate-300'} bg-white px-3 text-[15px] text-slate-700 outline-none focus:border-blue-500`}
                    placeholder="Last Name"
                  />
                </div>
              </div>
              {errors.primaryContact && (
                <p className="mt-1 text-sm text-red-500">{errors.primaryContact}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Company Name</label>
            <div className="max-w-[620px]">
              <input
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (errors.companyName) setErrors({ ...errors, companyName: '' });
                }}
                className={`w-full rounded-xl border ${errors.companyName ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500`}
                placeholder="Company Name"
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Email Address</label>
            <div className="max-w-[620px]">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className={`w-full rounded-xl border ${errors.email ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500`}
                placeholder="Email Address"
              />
              {errors.email && <p className="text-sm mt-1 text-red-500">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-4">
            <label className="pt-2 text-[15px] font-medium text-slate-700">Phone</label>
            <div className="max-w-[620px]">
              <input
                value={phone}
                type="tel"
                onChange={(e) => {
                  const value = e.target.value;

                  if (!/^[0-9]*$/.test(value) && value !== '') {
                    setErrors({ ...errors, phone: 'Only numbers are allowed' });
                    return;
                  }

                  setPhone(value);

                  if (value.length === 0) {
                    setErrors({ ...errors, phone: 'Phone number is required' });
                  } else if (value.length !== 10) {
                    setErrors({ ...errors, phone: 'Phone number must be exactly 10 digits' });
                  } else if (!/^[6-9][0-9]{9}$/.test(value)) {
                    setErrors({ ...errors, phone: 'Phone number must start with 6, 7, 8, or 9' });
                  } else {
                    setErrors({ ...errors, phone: '' });
                  }
                }}
                className={`w-full rounded-xl border ${errors.phone ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500`}
                placeholder="Work Phone"
                maxLength={10}
              />
              {errors.phone && <p className="text-sm mt-1 text-red-500">{errors.phone}</p>}
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
                  <div className="max-w-[620px]">
                    <input
                      value={pan}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        if (!/^[A-Z0-9]*$/.test(value) && value !== '') {
                          return;
                        }
                        if (value.length > 10) {
                          return;
                        }
                        let isValid = true;
                        for (let i = 0; i < value.length; i++) {
                          const char = value[i];
                          if (i < 5) {
                            if (!/^[A-Z]$/.test(char)) {
                              isValid = false;
                              break;
                            }
                          } else if (i < 9) {
                            if (!/^[0-9]$/.test(char)) {
                              isValid = false;
                              break;
                            }
                          } else if (i === 9) {
                            if (!/^[A-Z]$/.test(char)) {
                              isValid = false;
                              break;
                            }
                          }
                        }

                        if (isValid || value === '') {
                          setPan(value);
                          if (errors.pan) setErrors({ ...errors, pan: '' });
                        }
                      }}
                      onBlur={() => {
                        if (pan.length > 0 && pan.length !== 10) {
                          setErrors({ ...errors, pan: 'PAN must be exactly 10 characters' });
                        } else if (pan.length === 10 && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
                          setErrors({ ...errors, pan: 'Invalid PAN format (e.g., ABCDE1234F)' });
                        } else {
                          setErrors({ ...errors, pan: '' });
                        }
                      }}
                      className={`max-w-[620px] rounded-xl border ${errors.pan ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-[15px] uppercase outline-none focus:border-blue-500`}
                      placeholder="PAN (e.g., ABCDE1234F)"
                      maxLength={10}
                    />
                    {errors.pan && (
                      <p className="mt-1 text-sm text-red-500">{errors.pan}</p>
                    )}
                  </div>
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
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Attention</label>
                      <input
                        value={billingAddress.attention}
                        onChange={(e) => {
                          updateBillingAddress('attention', e.target.value);
                          if (errors.billingAttention) setErrors({ ...errors, billingAttention: '' });
                        }}
                        className={`w-full rounded-lg border ${errors.billingAttention ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                        placeholder="Attention"
                      />
                      {errors.billingAttention && <p className="mt-1 text-xs text-red-500">{errors.billingAttention}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Address</label>
                      <textarea
                        value={billingAddress.address}
                        onChange={(e) => {
                          updateBillingAddress('address', e.target.value);
                          if (errors.billingAddress) setErrors({ ...errors, billingAddress: '' });
                        }}
                        className={`min-h-[90px] w-full rounded-lg border ${errors.billingAddress ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                        placeholder="Address"
                      />
                      {errors.billingAddress && <p className="mt-1 text-xs text-red-500">{errors.billingAddress}</p>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">City</label>
                        <input
                          value={billingAddress.city}
                          onChange={(e) => {
                            updateBillingAddress('city', e.target.value);
                            if (errors.billingCity) setErrors({ ...errors, billingCity: '' });
                          }}
                          className={`w-full rounded-lg border ${errors.billingCity ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                          placeholder="City"
                        />
                        {errors.billingCity && <p className="mt-1 text-xs text-red-500">{errors.billingCity}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Pin Code</label>
                        <input
                          value={billingAddress.pin_code}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!/^[0-9]*$/.test(value) && value !== '') return;
                            if (value.length > 6) return;
                            updateBillingAddress('pin_code', value);
                            if (errors.billingPin) setErrors({ ...errors, billingPin: '' });
                          }}
                          maxLength={6}
                          className={`w-full rounded-lg border ${errors.billingPin ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                          placeholder="Pin Code"
                        />
                        {errors.billingPin && <p className="mt-1 text-xs text-red-500">{errors.billingPin}</p>}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                        <input
                          type="email"
                          value={billingAddress.email}
                          onChange={(e) => {
                            updateBillingAddress('email', e.target.value);
                            if (errors.billingEmail) setErrors({ ...errors, billingEmail: '' });
                          }}
                          className={`w-full rounded-lg border ${errors.billingEmail ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                          placeholder="Email"
                        />
                        {errors.billingEmail && <p className="mt-1 text-xs text-red-500">{errors.billingEmail}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Phone</label>
                        <input
                          value={billingAddress.phone}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!/^[0-9]*$/.test(value) && value !== '') return;
                            updateBillingAddress('phone', value);
                            if (errors.billingPhone) setErrors({ ...errors, billingPhone: '' });
                          }}
                          maxLength={10}
                          className={`w-full rounded-lg border ${errors.billingPhone ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                          placeholder="Phone"
                        />
                        {errors.billingPhone && <p className="mt-1 text-xs text-red-500">{errors.billingPhone}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Shipping Address</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Attention</label>
                      <input
                        value={shippingAddress.attention}
                        onChange={(e) => {
                          updateShippingAddress('attention', e.target.value);
                          if (errors.shippingAttention) setErrors({ ...errors, shippingAttention: '' });
                        }}
                        className={`w-full rounded-lg border ${errors.shippingAttention ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                        placeholder="Attention"
                      />
                      {errors.shippingAttention && <p className="mt-1 text-xs text-red-500">{errors.shippingAttention}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Address</label>
                      <textarea
                        value={shippingAddress.address}
                        onChange={(e) => {
                          updateShippingAddress('address', e.target.value);
                          if (errors.shippingAddress) setErrors({ ...errors, shippingAddress: '' });
                        }}
                        className={`min-h-[90px] w-full rounded-lg border ${errors.shippingAddress ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                        placeholder="Address"
                      />
                      {errors.shippingAddress && <p className="mt-1 text-xs text-red-500">{errors.shippingAddress}</p>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">City</label>
                        <input
                          value={shippingAddress.city}
                          onChange={(e) => {
                            updateShippingAddress('city', e.target.value);
                            if (errors.shippingCity) setErrors({ ...errors, shippingCity: '' });
                          }}
                          className={`w-full rounded-lg border ${errors.shippingCity ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                          placeholder="City"
                        />
                        {errors.shippingCity && <p className="mt-1 text-xs text-red-500">{errors.shippingCity}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Pin Code</label>
                        <input
                          value={shippingAddress.pin_code}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!/^[0-9]*$/.test(value) && value !== '') return;
                            if (value.length > 6) return;
                            updateShippingAddress('pin_code', value);
                            if (errors.shippingPin) setErrors({ ...errors, shippingPin: '' });
                          }}
                          maxLength={6}
                          className={`w-full rounded-lg border ${errors.shippingPin ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                          placeholder="Pin Code"
                        />
                        {errors.shippingPin && <p className="mt-1 text-xs text-red-500">{errors.shippingPin}</p>}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                        <input
                          type="email"
                          value={shippingAddress.email}
                          onChange={(e) => {
                            updateShippingAddress('email', e.target.value);
                            if (errors.shippingEmail) setErrors({ ...errors, shippingEmail: '' });
                          }}
                          className={`w-full rounded-lg border ${errors.shippingEmail ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                          placeholder="Email"
                        />
                        {errors.shippingEmail && <p className="mt-1 text-xs text-red-500">{errors.shippingEmail}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Phone</label>
                        <input
                          value={shippingAddress.phone}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!/^[0-9]*$/.test(value) && value !== '') return;
                            updateShippingAddress('phone', value);
                            if (errors.shippingPhone) setErrors({ ...errors, shippingPhone: '' });
                          }}
                          maxLength={10}
                          className={`w-full rounded-lg border ${errors.shippingPhone ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                          placeholder="Phone"
                        />
                        {errors.shippingPhone && <p className="mt-1 text-xs text-red-500">{errors.shippingPhone}</p>}
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
                  {contactPersons.map((person, index) => {
                    const hasAnyField =
                      (person.first_name?.trim() || '') !== '' ||
                      (person.last_name?.trim() || '') !== '' ||
                      (person.email?.trim() || '') !== '' ||
                      (person.phone?.trim() || '') !== '';

                    return (
                      <div key={person.id} className="flex flex-wrap items-start gap-4">
                        <div className="flex-1 min-w-[120px]">
                          <label className="text-sm font-medium text-slate-700">First Name</label>
                          <input
                            value={person.first_name}
                            onChange={(e) => {
                              updateContactPerson(person.id, 'first_name', e.target.value);
                              if (errors[`contactFirstName_${index}`]) {
                                const newErrors = { ...errors };
                                delete newErrors[`contactFirstName_${index}`];
                                setErrors(newErrors);
                              }
                            }}
                            className={`w-full rounded-lg border ${errors[`contactFirstName_${index}`] && hasAnyField ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                            placeholder="First Name"
                          />
                          {errors[`contactFirstName_${index}`] && hasAnyField && (
                            <p className="mt-1 text-xs text-red-500">{errors[`contactFirstName_${index}`]}</p>
                          )}
                        </div>

                        <div className="flex-1 min-w-[120px]">
                          <label className="text-sm font-medium text-slate-700">Last Name</label>
                          <input
                            value={person.last_name}
                            onChange={(e) => {
                              updateContactPerson(person.id, 'last_name', e.target.value);
                              if (errors[`contactLastName_${index}`]) {
                                const newErrors = { ...errors };
                                delete newErrors[`contactLastName_${index}`];
                                setErrors(newErrors);
                              }
                            }}
                            className={`w-full rounded-lg border ${errors[`contactLastName_${index}`] && hasAnyField ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                            placeholder="Last Name"
                          />
                          {errors[`contactLastName_${index}`] && hasAnyField && (
                            <p className="mt-1 text-xs text-red-500">{errors[`contactLastName_${index}`]}</p>
                          )}
                        </div>

                        <div className="flex-1 min-w-[150px]">
                          <label className="text-sm font-medium text-slate-700">Email</label>
                          <input
                            value={person.email}
                            onChange={(e) => {
                              updateContactPerson(person.id, 'email', e.target.value);
                              if (errors[`contactEmail_${index}`]) {
                                const newErrors = { ...errors };
                                delete newErrors[`contactEmail_${index}`];
                                setErrors(newErrors);
                              }
                            }}
                            className={`w-full rounded-lg border ${errors[`contactEmail_${index}`] && hasAnyField ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                            placeholder="Email Address"
                          />
                          {errors[`contactEmail_${index}`] && hasAnyField && (
                            <p className="mt-1 text-xs text-red-500">{errors[`contactEmail_${index}`]}</p>
                          )}
                        </div>

                        <div className="flex-1 min-w-[150px]">
                          <label className="text-sm font-medium text-slate-700">Phone</label>
                          <input
                            value={person.phone}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!/^[0-9]*$/.test(value) && value !== '') return;
                              updateContactPerson(person.id, 'phone', value);
                              if (errors[`contactPhone_${index}`]) {
                                const newErrors = { ...errors };
                                delete newErrors[`contactPhone_${index}`];
                                setErrors(newErrors);
                              }
                            }}
                            maxLength={10}
                            className={`w-full rounded-lg border ${errors[`contactPhone_${index}`] && hasAnyField ? 'border-red-500' : 'border-slate-300'} bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500`}
                            placeholder="Phone Number"
                          />
                          {errors[`contactPhone_${index}`] && hasAnyField && (
                            <p className="mt-1 text-xs text-red-500">{errors[`contactPhone_${index}`]}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeContactPerson(person.id)}
                          className="rounded-md p-2 mt-5 text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addContactPerson}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
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