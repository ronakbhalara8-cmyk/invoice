"use client";

import { useEffect, useRef, useState } from 'react';
import { Building2, Calendar, Edit, Mail, MapPin, Phone, StickyNote, User, X } from 'lucide-react';

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

export default function CustomerDetailSidebar({ isOpen, onClose, customer, onEdit }) {
  const [isClosing, setIsClosing] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 250);
  };

  if (!customer) return null;

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unnamed Customer';
  const companyName = customer.company_name || 'N/A';
  const billingAddress = customer.billing_address || {};
  const shippingAddress = customer.shipping_address || {};
  const contactPersons = Array.isArray(customer.contact_persons) ? customer.contact_persons : [];

  return (
    <>
      <div className={`fixed inset-0 z-50 h-screen bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={handleClose} />

      <aside
        ref={sidebarRef}
        className={`fixed font-sans right-0 top-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl transition-all duration-300 ${isOpen && !isClosing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-blue-100">Customer</p>
              <h2 className="text-lg font-semibold">Details</h2>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="rounded-xl bg-white/10 p-2 transition hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-[calc(100%-80px)] space-y-5 overflow-y-auto p-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900">Name</p>
                <h3 className="mt-2 text-2xl font-bold text-gray-900">{fullName}</h3>
              </div>
              <button type="button" onClick={() => onEdit?.(customer)} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500">
                <Edit className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${customer.customer_type === 'Business' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}`}>
                {customer.customer_type || 'Individual'}
              </span>
              <div>
                <span className="text-xs font-medium text-gray-500">Currency:</span>
                <span className="ml-1 text-sm font-semibold text-gray-900">{customer.currency || '-'}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900">Company</span>
              </div>
              <p className="text-sm text-gray-800">{formatValue(companyName)}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <Mail className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900">Email</span>
              </div>
              <p className="text-sm text-gray-800">{formatValue(customer.email)}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <Phone className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900">Phone</span>
              </div>
              <p className="text-sm text-gray-800">{formatValue(customer.phone)}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900">Created</span>
              </div>
              <p className="text-sm text-gray-800">{customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-GB') : '—'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-500">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900">Billing Address</span>
            </div>
            <div className="space-y-1 text-sm text-gray-700">
              <p>{formatValue(billingAddress.attention)}</p>
              <p>{formatValue(billingAddress.address)}</p>
              <p>{[billingAddress.city, billingAddress.pin_code].filter(Boolean).join(', ') || '—'}</p>
              <p>{formatValue(billingAddress.email)}</p>
              <p>{formatValue(billingAddress.phone)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-500">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900">Shipping Address</span>
            </div>
            <div className="space-y-1 text-sm text-gray-700">
              <p>{formatValue(shippingAddress.attention)}</p>
              <p>{formatValue(shippingAddress.address)}</p>
              <p>{[shippingAddress.city, shippingAddress.pin_code].filter(Boolean).join(', ') || '—'}</p>
              <p>{formatValue(shippingAddress.email)}</p>
              <p>{formatValue(shippingAddress.phone)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-500">
              <StickyNote className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900">Other Details</span>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <p><span className="text-xs font-bold uppercase text-gray-900">PAN :</span> {formatValue(customer.pan)}</p>
              <p><span className="text-xs font-bold uppercase text-gray-900">Payment Terms :</span> {formatValue(customer.payment_terms)}</p>
              <p><span className="text-xs font-bold uppercase text-gray-900">Remarks :</span> {formatValue(customer.remarks)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-500">
              <User className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900">Contact Persons</span>
            </div>
            {contactPersons.length > 0 ? (
              <div className="space-y-3">
                {contactPersons.map((person, index) => (
                  <div key={`${person.email || person.phone || index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="font-medium text-gray-800">{[person.first_name, person.last_name].filter(Boolean).join(' ') || `Contact ${index + 1}`}</p>
                    <p className="mt-1 text-sm text-gray-600">{formatValue(person.email)}</p>
                    <p className="text-sm text-gray-600">{formatValue(person.phone)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No contact persons added.</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
