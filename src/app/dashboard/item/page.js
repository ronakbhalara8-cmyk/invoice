"use client";

import { Plus, ChevronLeft, ChevronRight, Search, Edit, Trash2, MoreHorizontal, Filter, Download } from "lucide-react";
import { useState } from "react";

export default function Items() {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const [sortConfig, setSortConfig] = useState(null);

    // Sample data - replace with your actual data
    const items = [
        { id: 1, name: "Laptop Pro", category: "Electronics", price: 999.99, stock: 45, status: "In Stock" },
        { id: 2, name: "Wireless Mouse", category: "Accessories", price: 29.99, stock: 120, status: "In Stock" },
        { id: 3, name: "USB-C Cable", category: "Accessories", price: 15.99, stock: 0, status: "Out of Stock" },
        { id: 4, name: "Monitor 27\"", category: "Electronics", price: 349.99, stock: 18, status: "In Stock" },
        { id: 5, name: "Keyboard Mechanical", category: "Accessories", price: 89.99, stock: 32, status: "In Stock" },
        { id: 6, name: "External SSD", category: "Storage", price: 129.99, stock: 7, status: "Low Stock" },
        { id: 7, name: "Webcam HD", category: "Electronics", price: 59.99, stock: 23, status: "In Stock" },
        { id: 8, name: "USB Hub", category: "Accessories", price: 39.99, stock: 56, status: "In Stock" },
        { id: 9, name: "Laptop Stand", category: "Accessories", price: 45.99, stock: 14, status: "In Stock" },
        { id: 10, name: "Power Bank", category: "Electronics", price: 79.99, stock: 28, status: "In Stock" },
        { id: 11, name: "HDMI Cable", category: "Accessories", price: 12.99, stock: 89, status: "In Stock" },
        { id: 12, name: "Wireless Charger", category: "Electronics", price: 34.99, stock: 41, status: "In Stock" },
        { id: 13, name: "Bluetooth Speaker", category: "Audio", price: 149.99, stock: 9, status: "Low Stock" },
        { id: 14, name: "Smart Watch", category: "Electronics", price: 199.99, stock: 15, status: "In Stock" },
        { id: 15, name: "USB Flash Drive", category: "Storage", price: 24.99, stock: 67, status: "In Stock" },
        { id: 16, name: "Noise Cancelling Headphones", category: "Audio", price: 249.99, stock: 3, status: "Low Stock" },
        { id: 17, name: "Tablet Pro", category: "Electronics", price: 499.99, stock: 8, status: "In Stock" },
        { id: 18, name: "Stylus Pen", category: "Accessories", price: 19.99, stock: 34, status: "In Stock" },
        { id: 19, name: "Screen Protector", category: "Accessories", price: 9.99, stock: 0, status: "Out of Stock" },
        { id: 20, name: "Laptop Bag", category: "Accessories", price: 39.99, stock: 22, status: "In Stock" },
        { id: 21, name: "Wireless Keyboard", category: "Accessories", price: 69.99, stock: 16, status: "In Stock" },
        { id: 22, name: "Gaming Mouse", category: "Accessories", price: 49.99, stock: 27, status: "In Stock" },
        { id: 23, name: "External HDD", category: "Storage", price: 89.99, stock: 11, status: "In Stock" },
        { id: 24, name: "USB Microphone", category: "Audio", price: 79.99, stock: 5, status: "Low Stock" },
        { id: 25, name: "Desk Lamp", category: "Accessories", price: 29.99, stock: 38, status: "In Stock" },
    ];

    // Filter items based on search
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort items
    const sortedItems = [...filteredItems];
    if (sortConfig) {
        sortedItems.sort((a, b) => {
            const aValue = a;
            const bValue = b;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' 
                    ? aValue.localeCompare(bValue) 
                    : bValue.localeCompare(aValue);
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' 
                    ? aValue - bValue 
                    : bValue - aValue;
            }
            return 0;
        });
    }

    // Calculate pagination
    const totalItems = sortedItems.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentItems = sortedItems.slice(startIndex, endIndex);

    // Handle page change
    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Handle rows per page change
    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    // Handle sort
    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return prev.direction === 'asc' 
                    ? { key, direction: 'desc' } 
                    : null;
            }
            return { key, direction: 'asc' };
        });
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectedItems.length === currentItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(currentItems.map(item => item.id));
        }
    };

    // Handle select one
    const handleSelectOne = (id) => {
        setSelectedItems(prev => 
            prev.includes(id) 
                ? prev.filter(itemId => itemId !== id)
                : [...prev, id]
        );
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case "In Stock":
                return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
            case "Out of Stock":
                return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
            case "Low Stock":
                return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
            default:
                return "bg-gray-50 text-gray-700 ring-1 ring-gray-600/20";
        }
    };

    // Get stock indicator
    const getStockIndicator = (stock) => {
        if (stock === 0) return { color: "bg-rose-400", text: "Out" };
        if (stock < 10) return { color: "bg-amber-400", text: "Low" };
        return { color: "bg-emerald-400", text: "In" };
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/80">
            {/* ===== STICKY HEADER ===== */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200/80 px-8 py-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Items</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {totalItems} items • Manage your inventory
                        </p>
                    </div>
                    <div className="flex items-center gap-x-3">
                        <button className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all">
                            <Download size={16} />
                            Export
                        </button>
                        <button className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all">
                            <Filter size={16} />
                            Filter
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 pr-4 py-2 w-72 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm shadow-blue-600/20">
                            <Plus size={18} />
                            New Item
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== TABLE CONTAINER ===== */}
            <div className="flex-1 flex flex-col min-h-0 mx-8 my-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                {/* ===== STICKY TABLE HEADER ===== */}
                <div className="sticky top-[73px] z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
                    <div className="px-4">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3.5 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.length === currentItems.length && currentItems.length > 0}
                                            onChange={handleSelectAll}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none w-12">
                                        #
                                    </th>
                                    <th 
                                        className="px-4 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Item Name
                                            {sortConfig?.key === 'name' && (
                                                <span className="text-slate-400">
                                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
                                        onClick={() => handleSort('category')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Category
                                            {sortConfig?.key === 'category' && (
                                                <span className="text-slate-400">
                                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3.5 text-right text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
                                        onClick={() => handleSort('price')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Price
                                            {sortConfig?.key === 'price' && (
                                                <span className="text-slate-400">
                                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
                                        onClick={() => handleSort('stock')}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            Stock
                                            {sortConfig?.key === 'stock' && (
                                                <span className="text-slate-400">
                                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 uppercase tracking-wider select-none">
                                        Status
                                    </th>
                                    <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 uppercase tracking-wider select-none w-24">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                </div>

                {/* ===== SCROLLABLE TABLE BODY ===== */}
                <div className="flex-1 overflow-auto">
                    <div className="px-4">
                        <table className="w-full">
                            <tbody className="divide-y divide-slate-100">
                                {currentItems.length > 0 ? (
                                    currentItems.map((item, index) => {
                                        const stockIndicator = getStockIndicator(item.stock);
                                        return (
                                            <tr 
                                                key={item.id} 
                                                className="hover:bg-slate-50/60 transition-colors group"
                                            >
                                                <td className="px-4 py-3.5 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.includes(item.id)}
                                                        onChange={() => handleSelectOne(item.id)}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-slate-400 font-mono whitespace-nowrap w-12">
                                                    {startIndex + index + 1}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold">
                                                            {item.name.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-900">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-slate-900 text-right whitespace-nowrap font-medium">
                                                    ${item.price.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${stockIndicator.color}`} />
                                                        <span className={`text-sm font-medium ${
                                                            item.stock === 0 ? 'text-rose-600' :
                                                            item.stock < 10 ? 'text-amber-600' :
                                                            'text-emerald-600'
                                                        }`}>
                                                            {item.stock}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                                                            <Edit size={15} />
                                                        </button>
                                                        <button className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
                                                            <Trash2 size={15} />
                                                        </button>
                                                        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                                            <MoreHorizontal size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <Search size={20} className="text-slate-400" />
                                                </div>
                                                <p className="text-sm text-slate-500">No items found</p>
                                                <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ===== STICKY PAGINATION FOOTER ===== */}
                <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span>Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={handleRowsPerPageChange}
                                className="px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm cursor-pointer"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-slate-500 hidden sm:inline">
                                Showing {totalItems === 0 ? '0' : startIndex + 1} - {Math.min(endIndex, totalItems)} of {totalItems}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-lg border ${
                                    currentPage === 1
                                        ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                } transition-all`}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                                    let page;
                                    if (totalPages <= 7) {
                                        page = i + 1;
                                    } else if (currentPage <= 4) {
                                        page = i + 1;
                                    } else if (currentPage >= totalPages - 3) {
                                        page = totalPages - 6 + i;
                                    } else {
                                        page = currentPage - 3 + i;
                                    }
                                    
                                    if (page >= 1 && page <= totalPages) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                    currentPage === page
                                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                                        : 'text-slate-600 hover:bg-slate-100'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`p-2 rounded-lg border ${
                                    currentPage === totalPages || totalPages === 0
                                        ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                } transition-all`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}