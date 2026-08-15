"use client";

import { useEffect, useState } from 'react';
import { FilePlus2, FileText } from 'lucide-react';
import CustomersTable from '@/components/customers/CustomersTable';
import CustomerModal from '@/components/customers/CustomerModal';
import CustomerDetailSidebar from '@/components/customers/CustomerDetailSidebar';
import DeleteConfirmModal from '@/components/customers/DeleteConfirmModal';

export default function CustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customers');
      const result = await response.json();

      if (result.success) {
        setCustomers(result.data || []);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAddCustomer = () => {
    setModalMode('add');
    setSelectedCustomer(null);
    setShowForm(true);
    setIsSidebarOpen(false);
  };

  const openEditCustomer = (customer) => {
    setModalMode('edit');
    setSelectedCustomer(customer);
    setShowForm(true);
    setIsSidebarOpen(false);
  };

  const handleCustomerAdded = (customer) => {
    setCustomers((prev) => [customer, ...prev]);
    setShowForm(false);
    setSelectedCustomer(null);
  };

  const handleCustomerUpdated = (updatedCustomer) => {
    setCustomers((prev) => prev.map((customer) => (customer.id === updatedCustomer.id ? updatedCustomer : customer)));
    setShowForm(false);
    setSelectedCustomer(null);
  };

  const handleDeleteCustomer = (customerId) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== customerId));
    setIsDeleteModalOpen(false);
    setSelectedCustomer(null);
    setIsSidebarOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Management</p>
              <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
            </div>
          </div>

          {!showForm && (
            <button
              type="button"
              onClick={openAddCustomer}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500"
            >
              <FilePlus2 className="h-4 w-4" />
              Add Customer
            </button>
          )}
        </div>
      </div>

      {showForm ? (
        <CustomerModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          mode={modalMode}
          onCustomerAdded={handleCustomerAdded}
          onCustomerUpdated={handleCustomerUpdated}
        />
      ) : (
        <>
          <CustomersTable
            customers={customers}
            loading={loading}
            onAddClick={openAddCustomer}
            onEditClick={openEditCustomer}
            onDeleteClick={(customer) => {
              setSelectedCustomer(customer);
              setIsDeleteModalOpen(true);
            }}
            onCustomerClick={(customer) => {
              setSelectedCustomer(customer);
              setIsSidebarOpen(true);
            }}
          />

          <CustomerDetailSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            customer={selectedCustomer}
            onEdit={(customer) => {
              setSelectedCustomer(customer);
              setModalMode('edit');
              setShowForm(true);
              setIsSidebarOpen(false);
            }}
          />

          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedCustomer(null);
            }}
            customer={selectedCustomer}
            onCustomerDeleted={handleDeleteCustomer}
          />
        </>
      )}
    </div>
  );
}
