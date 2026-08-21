"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ItemsTable from "@/components/items/ItemsTable";
import ItemModal from "@/components/items/ItemModal";
import ItemDetailSidebar from "@/components/items/ItemDetailSidebar";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { toast } from "react-toastify";

function ItemsPageContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ✅ Track if modal was opened from table (not from sidebar)
  const [isFromTable, setIsFromTable] = useState(false);

  // Fetch items
  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === 'true') openAddModal();
  }, [searchParams]);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      const result = await response.json();
      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Error fetching items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (newItem) => {
    setItems(prev => [...prev, newItem]);
    // ✅ Close modal and DON'T open sidebar
    setIsModalOpen(false);
    setSelectedItem(null);
    setIsFromTable(false);
  };

  const handleUpdateItem = (updatedItem) => {
    setItems(prev => prev.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    ));
    // ✅ Update selected item if sidebar is open
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
    // ✅ Close modal and DON'T open sidebar if from table
    if (isFromTable) {
      setIsModalOpen(false);
      setIsFromTable(false);
      // ✅ Keep sidebar closed
      setIsSidebarOpen(false);
      setSelectedItem(null);
    }
  };

  const handleDeleteItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    // ✅ Close everything
    setIsDeleteModalOpen(false);
    setIsSidebarOpen(false);
    setSelectedItem(null);
    setIsFromTable(false);
  };

  // ✅ Open Add Modal from Table
  const openAddModal = () => {
    setIsFromTable(true); // ✅ Mark as from table
    setSelectedItem(null);
    setModalMode('add');
    setIsModalOpen(true);
    setIsSidebarOpen(false); // ✅ Close sidebar if open
  };

  // ✅ Open Edit Modal from Table or Sidebar
  const openEditModal = (item, fromTable = true) => {
    setIsFromTable(fromTable); // ✅ Track source
    setSelectedItem(item);
    setModalMode('edit');
    setIsModalOpen(true);
    // ✅ If from table, close sidebar
    if (fromTable) {
      setIsSidebarOpen(false);
    }
  };

  // ✅ Open Sidebar (only from table row click)
  const openSidebar = (item) => {
    setSelectedItem(item);
    setIsSidebarOpen(true);
    setIsFromTable(false); // ✅ Reset flag
  };

  // ✅ Close Sidebar
  const closeSidebar = () => {
    setIsSidebarOpen(false);
    setTimeout(() => {
      if (!isModalOpen && !isDeleteModalOpen) {
        setSelectedItem(null);
      }
    }, 300);
  };

  // ✅ Open Delete Modal
  const openDeleteModal = (item) => {
    setIsFromTable(true); // ✅ Mark as from table
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
    setIsSidebarOpen(false); // ✅ Close sidebar if open
  };

  // ✅ Modal Close Handler - FIXED
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setIsFromTable(false);
    // ✅ DO NOT open sidebar - keep it closed
    setIsSidebarOpen(false);
  };

  // ✅ Delete Modal Close Handler - FIXED
  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setSelectedItem(null);
    setIsFromTable(false);
    // ✅ DO NOT open sidebar - keep it closed
    setIsSidebarOpen(false);
  };

  return (
    <>
      <ItemsTable
        items={items}
        loading={loading}
        onAddClick={openAddModal}
        onEditClick={(item) => openEditModal(item, true)} // ✅ fromTable = true
        onDeleteClick={openDeleteModal}
        onItemClick={openSidebar}
      />

      <ItemModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        item={selectedItem}
        mode={modalMode}
        onItemAdded={handleAddItem}
        onItemUpdated={handleUpdateItem}
      />

      <ItemDetailSidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        item={selectedItem}
        onEdit={(item) => openEditModal(item, false)} // ✅ fromTable = false (from sidebar)
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        item={selectedItem}
        apiPath={selectedItem ? `/api/items/${selectedItem.id}` : ''}
        resourceLabel="item"
        onDeleted={handleDeleteItem}
      />
    </>
  );
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<div className="min-h-32" />}>
      <ItemsPageContent />
    </Suspense>
  );
}