"use client";

import { useState, useEffect } from "react";
import ItemsTable from "@/components/items/ItemsTable";
import ItemModal from "@/components/items/ItemModal";
import ItemDetailSidebar from "@/components/items/ItemDetailSidebar";
import DeleteConfirmModal from "@/components/items/DeleteConfirmModal";
import { toast } from "react-toastify";

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch items
  useEffect(() => {
    fetchItems();
  }, []);

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
  };

  const handleUpdateItem = (updatedItem) => {
    setItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    // Close sidebar if the updated item is currently selected
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
  };

  const handleDeleteItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    if (selectedItem?.id === itemId) {
      setIsSidebarOpen(false);
      setSelectedItem(null);
    }
  };

  const openAddModal = () => {
    setSelectedItem(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setModalMode('edit');
    setIsModalOpen(true);
    // Close sidebar when opening edit modal
    setIsSidebarOpen(false);
  };

  const openSidebar = (item) => {
    setSelectedItem(item);
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    // Don't clear selectedItem immediately to allow for smooth transition
    setTimeout(() => {
      if (!isModalOpen && !isDeleteModalOpen) {
        setSelectedItem(null);
      }
    }, 300);
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
    setIsSidebarOpen(false);
  };

  return (
    <>
      <ItemsTable 
        items={items}
        loading={loading}
        onAddClick={openAddModal}
        onEditClick={openEditModal}
        onDeleteClick={openDeleteModal}
        onItemClick={openSidebar}
      />

      <ItemModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          // Reopen sidebar if we were viewing an item
          if (selectedItem && !isDeleteModalOpen) {
            setIsSidebarOpen(true);
          }
        }}
        item={selectedItem}
        mode={modalMode}
        onItemAdded={handleAddItem}
        onItemUpdated={handleUpdateItem}
      />

      <ItemDetailSidebar 
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        item={selectedItem}
        onEdit={openEditModal}
      />

      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          // Reopen sidebar if we were viewing an item
          if (selectedItem && !isModalOpen) {
            setIsSidebarOpen(true);
          }
        }}
        item={selectedItem}
        onItemDeleted={handleDeleteItem}
      />
    </>
  );
}