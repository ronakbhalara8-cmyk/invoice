"use client";

import { Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

export default function Items() {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");

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

    // Calculate pagination
    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentItems = filteredItems.slice(startIndex, endIndex);

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

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case "In Stock":
                return "bg-green-100 text-green-800";
            case "Out of Stock":
                return "bg-red-100 text-red-800";
            case "Low Stock":
                return "bg-yellow-100 text-yellow-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* ===== STICKY HEADER ===== */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-2xl font-bold text-gray-900">Items</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {totalItems} Total • Manage your inventory items
                        </p>
                    </div>
                    <div className="flex items-center gap-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 pr-4 py-2 w-72 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                            <Plus size={18} />
                            New Item
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== TABLE CONTAINER ===== */}
            <div className="flex-1 flex flex-col min-h-0 mx-6 my-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

                {/* ===== STICKY TABLE HEADER ===== */}
                <div className="sticky top-[73px] z-20 bg-gray-50 border-b border-gray-200">
                    <div className="px-4">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-12">
                                        #
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                        ITEM NAME
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                        CATEGORY
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                        PRICE
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                        STOCK
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                        STATUS
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                        ACTION
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
                            <tbody className="divide-y divide-gray-200">
                                {currentItems.length > 0 ? (
                                    currentItems.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap w-12">
                                                {startIndex + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                {item.name}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {item.category}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                                                ${item.price.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                                                {item.stock}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <button className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                                                    Edit
                                                </button>
                                                <button className="ml-4 text-red-600 hover:text-red-800 font-medium text-sm transition-colors">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                                            No items found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ===== STICKY PAGINATION FOOTER ===== */}
                <div className="sticky bottom-0 z-20 bg-white border-t border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                            <span>Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={handleRowsPerPageChange}
                                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-gray-500 hidden sm:inline">
                                Showing {totalItems === 0 ? '0' : startIndex + 1} - {Math.min(endIndex, totalItems)} of {totalItems} results
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-lg border ${currentPage === 1
                                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                    } transition-colors`}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        Math.abs(page - currentPage) <= 1 ||
                                        (page === 2 && currentPage > 3) ||
                                        (page === totalPages - 1 && currentPage < totalPages - 2)
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    }
                                    if (page === 2 && currentPage > 3) {
                                        return <span key="ellipsis1" className="px-1 text-gray-500">...</span>;
                                    }
                                    if (page === totalPages - 1 && currentPage < totalPages - 2) {
                                        return <span key="ellipsis2" className="px-1 text-gray-500">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`p-2 rounded-lg border ${currentPage === totalPages || totalPages === 0
                                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                    } transition-colors`}
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