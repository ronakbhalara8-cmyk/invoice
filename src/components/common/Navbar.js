"use client";
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, FileCheck2, FileText, Package, Plus, Search, Users, X } from 'lucide-react';

const searchItems = [
  { label: 'Item List', group: 'Items', href: '/dashboard/item', icon: Package },
  { label: 'Add Item', group: 'Items', href: '/dashboard/item?create=true', icon: Plus },
  { label: 'Customer List', group: 'Customers', href: '/dashboard/customer', icon: Users },
  { label: 'Create Customer', group: 'Customers', href: '/dashboard/customer?create=true', icon: Plus },
  { label: 'Invoice List', group: 'Invoices', href: '/dashboard/invoice', icon: FileText },
  { label: 'Generate Invoice', group: 'Invoices', href: '/dashboard/invoice?create=true', icon: Plus },
  { label: 'Quotation List', group: 'Quotations', href: '/dashboard/quotation', icon: FileCheck2 },
  { label: 'Generate Quotation', group: 'Quotations', href: '/dashboard/quotation?create=true', icon: Plus },
  { label: 'Reports', group: 'Reports', href: '/dashboard/report', icon: BarChart3 },
];

export default function Navbar({ user, onMenuClick, onProfileClick }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchMounted, setIsSearchMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const organizationName = user?.organizationName || user?.company_name || user?.name || 'Organization';
  const userEmail = user?.email || 'N/A';
  const filteredItems = searchItems.filter((item) =>
    `${item.label} ${item.group}`.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  useEffect(() => {
    document.body.style.overflow = isSearchOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSearchOpen]);

  const openSearch = () => {
    setSearchTerm('');
    setIsSearchMounted(true);
    window.requestAnimationFrame(() => setIsSearchOpen(true));
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    window.setTimeout(() => setIsSearchMounted(false), 300);
  };

  const handleSearchItemClick = (href) => {
    closeSearch();
    router.push(href);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
        return;
      }

      if (event.key === 'Escape' && isSearchOpen) closeSearch();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const getPageTitle = () => {
    switch (pathname) {
      case '/dashboard': return 'Dashboard';
      case '/dashboard/products': return 'Products';
      case '/dashboard/billing': return 'Billing';
      case '/dashboard/selling': return 'Selling';
      case '/dashboard/out-of-stock': return 'Out of Stock';
      case '/dashboard/stock': return 'Stock Management';
      default: return 'Overview';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/90 shadow-sm backdrop-blur">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Menu button and Page Title */}
            <div className="flex items-center flex-1">
              <button
                onClick={onMenuClick}
                className="mr-4 rounded-md p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex-1">
                <h2 className="text-xl font-bold tracking-wide text-slate-800">
                  {getPageTitle()}
                </h2>
              </div>
            </div>

            {/* Right side - Search, Notifications and Profile */}
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={openSearch}
                aria-label="Search modules"
                className="flex w-75 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-400 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span>Search modules...</span>
                <kbd className="ml-auto hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">⌘ K</kbd>
              </button>
              {/* Notifications */}
              <button className="relative rounded-full p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>

              {/* Profile info */}
              <button
                type="button"
                onClick={onProfileClick}
                className="relative rounded-lg text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 shadow-sm">
                    <span className="text-sm font-bold text-white">
                      {organizationName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-slate-800">{organizationName}</p>
                    <p className="text-xs text-slate-500">{userEmail}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {isSearchMounted && (
        <div
          className={`fixed inset-0 z-60 bg-black/50 transition-opacity duration-300 ease-out ${isSearchOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          onClick={closeSearch}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search modules"
            className={`mx-auto mt-20 w-[calc(100%-2rem)] max-w-2xl origin-top-right will-change-transform transition-all duration-300 ease-out ${isSearchOpen ? 'translate-x-0 translate-y-0 scale-100 opacity-100' : 'translate-x-10 -translate-y-10 scale-0 opacity-0'} overflow-hidden rounded-2xl bg-white shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                autoFocus
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search items, customers, invoices..."
                className="min-w-0 flex-1 text-base text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={closeSearch} aria-label="Close search" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[min(28rem,60vh)] overflow-y-auto p-2">
              {filteredItems.length ? filteredItems.map(({ label, group, href, icon: Icon }) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => handleSearchItemClick(href)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-blue-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{label}</span>
                    <span className="block text-xs text-slate-400">{group}</span>
                  </span>
                </button>
              )) : (
                <p className="px-4 py-10 text-center text-sm text-slate-500">No matching module found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
