"use client";
import { usePathname } from 'next/navigation';

export default function Navbar({ user, onMenuClick }) {
  const pathname = usePathname();
  const organizationName = user?.organizationName || user?.company_name || user?.name || 'Organization';

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

          {/* Right side - Notifications and Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative rounded-full p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
            </button>

            {/* Profile info (Static) */}
            <div className="relative">
              <div
                className="flex items-center space-x-3 p-2 rounded-lg"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 shadow-sm">
                  <span className="text-sm font-bold text-white">
                    {organizationName.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-slate-800">{organizationName}</p>
                  <p className="text-xs text-slate-500">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
