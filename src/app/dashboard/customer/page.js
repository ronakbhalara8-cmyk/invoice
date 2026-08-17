"use client";

import {useEffect, useState} from 'react';
import {FilePlus2, FileText} from 'lucide-react';
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
