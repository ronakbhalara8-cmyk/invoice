"use client";

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit, Filter, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';

export default function CustomersTable({
  customers,
  loading,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onCustomerClick,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesType = customerTypeFilter === 'All' || customer.customer_type === customerTypeFilter;
      const text = [
        customer.first_name,
        customer.last_name,
        customer.company_name,
        customer.email,
        customer.phone,
        customer.customer_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesType && (!term || text.includes(term));
    });
  }, [customers, customerTypeFilter, searchTerm]);

  const sortedCustomers = useMemo(() => {
    const items = [...filteredCustomers];

    if (!sortConfig) return items;

    items.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue === bValue) return 0;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      return aValue > bValue ? direction : -direction;
    });

    return items;
  }, [filteredCustomers, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const currentItems = sortedCustomers.slice(startIndex, startIndex + rowsPerPage);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderCustomerName = (customer) => {
    const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unnamed Customer';
    return customer.customer_type === 'Business' ? customer.company_name || fullName : fullName;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">{sortedCustomers.length} customers • Manage your contacts</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-64"
            />
          </div>

          <div className="relative">
            <select
              value={customerTypeFilter}
              onChange={(e) => {
                setCustomerTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Types</option>
              <option value="Business">Business</option>
              <option value="Individual">Individual</option>
            </select>
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          <button
            onClick={onAddClick}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">No.</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  <button type="button" className="flex items-center gap-1" onClick={() => handleSort('first_name')}>
                    Customer
                    {sortConfig?.key === 'first_name' && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Company</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                    </div>
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((customer, index) => (
                  <tr
                    key={customer.id}
                    onClick={() => onCustomerClick(customer)}
                    className="cursor-pointer transition-colors hover:bg-gray-50/60"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{renderCustomerName(customer)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.company_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.phone || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${customer.customer_type === 'Business' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}`}>
                        {customer.customer_type || 'Individual'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick(customer);
                          }}
                          className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteClick(customer);
                          }}
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
