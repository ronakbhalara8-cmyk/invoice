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
  phone: '',
};

const initialShippingAddress = {
  attention: '',
  address: '',
  city: '',
  pin_code: '',
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
  const [paymentTerms, setPaymentTerms] = useState('');
  const [documents, setDocuments] = useState('');
  const [billingAddress, setBillingAddress] = useState(initialBillingAddress);
  const [shippingAddress, setShippingAddress] = useState(initialShippingAddress);
  const [contactPersons, setContactPersons] = useState([createEmptyContact()]);
  const [remarks, setRemarks] = useState('');
  const [customFields, setCustomFields] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('other');

  const tabs = ['other', 'address', 'contact', 'remarks'];

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
      setPaymentTerms(customer.payment_terms || '');
      setDocuments(customer.documents || '');
      setRemarks(customer.remarks || '');
      setCustomFields(typeof customer.custom_fields === 'string' ? customer.custom_fields : JSON.stringify(customer.custom_fields || {}, null, 2));
      setBillingAddress(customer.billing_address || initialBillingAddress);
      setShippingAddress(customer.shipping_address || initialShippingAddress);
      setContactPersons(Array.isArray(customer.contact_persons) && customer.contact_persons.length ? customer.contact_persons.map((person) => ({ ...person, id: person.id || Date.now() + Math.random() })) : [createEmptyContact()]);
    } else {
      setCustomerType('Business');
      setFirstName('');
      setLastName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setPan('');
      setPaymentTerms('');
      setDocuments('');
      setRemarks('');
      setCustomFields('');
      setBillingAddress(initialBillingAddress);
      setShippingAddress(initialShippingAddress);
      setContactPersons([createEmptyContact()]);
    }
  }, [isOpen, customer, mode]);

  const totalContactPersons = useMemo(() => contactPersons.filter((person) => person.first_name || person.last_name || person.email || person.phone).length, [contactPersons]);

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

  const updateBillingAddress = (field, value) => setBillingAddress((prev) => ({ ...prev, [field]: value }));
  const updateShippingAddress = (field, value) => setShippingAddress((prev) => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setCustomerType('Business');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setPan('');
    setPaymentTerms('');
    setDocuments('');
    setRemarks('');
    setCustomFields('');
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

    const payload = {
      customer_type: customerType,
      first_name: firstName,
      last_name: lastName,
      company_name: companyName,
      email,
      phone,
      pan,
      payment_terms: paymentTerms,
      documents,
      billing_address: billingAddress,
      shipping_address: shippingAddress,
      contact_persons: contactPersons.filter((person) => person.first_name || person.last_name || person.email || person.phone),
      custom_fields: customFields ? customFields : {},
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
    <div className="w-full rounded-[20px] border border-slate-200 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="px-6 pt-5">
        <h2 className="text-[42px] font-light leading-none tracking-[-0.04em] text-slate-900">
          {mode === 'add' ? 'New Customer' : 'Edit Customer'}
        </h2>
      </div>

      <div className="px-6 pb-4 pt-5">
        <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-[15px] text-sky-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M8 3.5A2.5 2.5 0 0 0 5.5 6v12A2.5 2.5 0 0 0 8 20.5h8A2.5 2.5 0 0 0 18.5 18V6A2.5 2.5 0 0 0 16 3.5H8Zm0 1.5h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 2h4v1.5h-4V7Zm-1 4h6v1.5h-6V11Zm0 3h5v1.5h-5V14Z"/>
            </svg>
          </div>
          <span>
            Prefill Customer details from GST portal using the Customer&apos;s GSTIN. <span className="font-semibold underline">Prefill</span> &nbsp;&gt;
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 pb-8 pt-3">
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
            <div className="grid max-w-[620px] grid-cols-[180px_1fr_1fr] gap-3">
              <select className="h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-700 outline-none ring-0 focus:border-blue-500">
                <option>Salutation</option>
              </select>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="First Name" />
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="Last Name" />
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="max-w-[620px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="Company Name" />
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-red-500">Display Name <span className="text-red-500">*</span></label>
            <select className="max-w-[620px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500">
              <option>Select or type to add</option>
            </select>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Currency</label>
            <div className="max-w-[620px]">
              <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500">
                <option>INR- Indian Rupee</option>
              </select>
              <p className="mt-2 text-[13px] text-red-500">Currency cannot be edited as multi-currency handling is unavailable in Zoho Invoice.</p>
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Email Address</label>
            <div className="flex max-w-[620px] items-center gap-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="Email Address" />
              <label className="flex items-center gap-2 text-[14px] text-slate-600">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" />
                <span>Primary</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-4">
            <label className="pt-2 text-[15px] font-medium text-slate-700">Phone</label>
            <div className="max-w-[620px] grid grid-cols-[108px_1fr_1fr] gap-3">
              <div className="flex items-center rounded-xl border border-slate-300 bg-white px-2 py-2.5">
                <span className="mr-2 text-[14px] text-slate-600">+91</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-slate-400" aria-hidden="true"><path d="M7 10l5 5 5-5H7z"/></svg>
              </div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="Work Phone" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500" placeholder="Mobile" />
            </div>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
            <label className="text-[15px] font-medium text-slate-700">Customer Language</label>
            <select className="max-w-[620px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500">
              <option>English</option>
            </select>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200">
          <div className="mt-4 flex gap-8 border-b border-slate-200 pb-2 text-[15px] text-slate-500">
            {['Other Details', 'Address', 'Contact Persons', 'Custom Fields', 'Remarks'].map((tabName, index) => (
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
                  <label className="text-[15px] font-medium text-slate-700">Payment Terms</label>
                  <select className="max-w-[620px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-500">
                    <option>Due on Receipt</option>
                  </select>
                </div>

                <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[15px] font-medium text-slate-700">Enable Portal?</label>
                  <label className="flex items-center gap-3 text-[15px] text-slate-700">
                    <input type="checkbox" className="h-4 w-4 accent-blue-600" />
                    Allow portal access for this customer
                  </label>
                </div>

                <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[15px] font-medium text-slate-700">Documents</label>
                  <div className="max-w-[620px]">
                    <div className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-slate-500">
                      <span className="inline-flex items-center gap-2 text-[15px]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M12 16.5V4.75l3.75 3.75h-2.5A1.25 1.25 0 0 1 12 7.25V16.5Zm-1.5 1.5h3A3.5 3.5 0 0 0 17 14.5v-7.5a1.5 1.5 0 0 0-.44-1.06l-2.5-2.5A1.5 1.5 0 0 0 12.56 3H7.5A1.5 1.5 0 0 0 6 4.5v10.5A1.5 1.5 0 0 0 7.5 16.5h3Zm-3 0h3a1.5 1.5 0 0 0 1.5-1.5V6H7.5A1.5 1.5 0 0 0 6 7.5v10.5A1.5 1.5 0 0 0 7.5 19.5Z"/></svg>
                        Upload File
                      </span>
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-slate-400" aria-hidden="true"><path d="M7 10l5 5 5-5H7z"/></svg>
                    </div>
                    <p className="mt-3 text-[13px] text-slate-500">You can upload a maximum of 3 files, 10MB each</p>
                  </div>
                </div>

                <button type="button" className="mt-2 text-left text-[15px] font-medium text-blue-600">Add more details</button>
              </div>
            )}

            {activeTab === 'address' && (
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Billing Address</h4>
                  <div className="space-y-3">
                    <input value={billingAddress.attention} onChange={(e) => updateBillingAddress('attention', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Attention" />
                    <textarea value={billingAddress.address} onChange={(e) => updateBillingAddress('address', e.target.value)} className="min-h-[90px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Address" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input value={billingAddress.city} onChange={(e) => updateBillingAddress('city', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="City" />
                      <input value={billingAddress.pin_code} onChange={(e) => updateBillingAddress('pin_code', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Pin Code" />
                    </div>
                    <input value={billingAddress.phone} onChange={(e) => updateBillingAddress('phone', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Phone" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Shipping Address</h4>
                  <div className="space-y-3">
                    <input value={shippingAddress.attention} onChange={(e) => updateShippingAddress('attention', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Attention" />
                    <textarea value={shippingAddress.address} onChange={(e) => updateShippingAddress('address', e.target.value)} className="min-h-[90px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Address" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input value={shippingAddress.city} onChange={(e) => updateShippingAddress('city', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="City" />
                      <input value={shippingAddress.pin_code} onChange={(e) => updateShippingAddress('pin_code', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Pin Code" />
                    </div>
                    <input value={shippingAddress.phone} onChange={(e) => updateShippingAddress('phone', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Phone" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-4">
                {contactPersons.map((person, index) => (
                  <div key={person.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Person {index + 1}</span>
                      <button type="button" onClick={() => removeContactPerson(person.id)} className="rounded-md p-2 text-red-500 transition hover:bg-red-50">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={person.first_name} onChange={(e) => updateContactPerson(person.id, 'first_name', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="First Name" />
                      <input value={person.last_name} onChange={(e) => updateContactPerson(person.id, 'last_name', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Last Name" />
                      <input value={person.email} onChange={(e) => updateContactPerson(person.id, 'email', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Email Address" />
                      <input value={person.phone} onChange={(e) => updateContactPerson(person.id, 'phone', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Phone Number" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addContactPerson} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                  <Plus size={16} />
                  Add Person
                </button>
              </div>
            )}

            {activeTab === 'remarks' && (
              <div className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
                  <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Notes" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Custom Fields</label>
                  <textarea value={customFields} onChange={(e) => setCustomFields(e.target.value)} className="min-h-[100px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Custom Fields" />
                </div>
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
