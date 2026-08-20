"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  LayoutDashboard,
  Package,
  FileText,
  FileCheck2,
  DollarSign,
  AlertTriangle,
  BarChart3,
  LogOut,
  ChevronLeft,
  X,
  Users
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggle }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Logged out successfully');
        localStorage.removeItem('user');
        sessionStorage.clear();
        router.push('/');
      } else {
        toast.error('Logout failed. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
    }
  };

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Items', href: '/dashboard/item', icon: Package },
    { name: 'Customers', href: '/dashboard/customer', icon: Users },
    { name: 'Invoice', href: '/dashboard/invoice', icon: FileText },
    { name: 'Quotation', href: '/dashboard/quotation', icon: FileCheck2 },
    { name: 'Reports', href: '/dashboard/report', icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 ${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-100 transform transition-all duration-300 ease-in-out flex flex-col overflow-visible
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:fixed
      `}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-slate-800 shrink-0 relative`}>
          <div className="flex items-center overflow-hidden">
            {!isCollapsed && (
              <span className="ml-3 text-white font-semibold text-lg truncate whitespace-nowrap animate-in fade-in slide-in-from-left-2">
                Invoice Management
              </span>
            )}
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={onToggle}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full items-center justify-center text-white shadow-lg hover:scale-110 transition-transform z-10"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="lg:hidden text-white hover:text-blue-400 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-visible mt-6 px-3 pb-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-3 text-sm font-medium rounded-xl transition-all group relative hover:z-70
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isCollapsed ? 'mr-0' : 'mr-3'} transition-all group-hover:scale-110`} />
                  {!isCollapsed ? (
                    <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-1">
                      {item.name}
                    </span>
                  ) : (
                    /* Tooltip for collapsed state */
                    <div className="absolute left-full ml-4 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap z-9999 shadow-[0_10px_30px_rgba(0,0,0,0.3)] -translate-x-2.5 group-hover:translate-x-0 pointer-events-none">
                      {item.name}
                      {/* Tooltip Arrow */}
                      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-blue-600 rotate-45" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-800 bg-slate-950 p-3 shrink-0">
          <button
            onClick={handleLogout}
            className={`
              flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-3 text-sm font-medium bg-blue-600 text-white cursor-pointer rounded-xl transition-all w-full text-left hover:bg-blue-500 active:scale-95 group relative hover:z-70
            `}
          >
            <LogOut className={`w-5 h-5 ${isCollapsed ? 'mr-0' : 'mr-3'}`} />
            {!isCollapsed ? (
              <span className="animate-in fade-in slide-in-from-left-1">Logout</span>
            ) : (
              /* Tooltip for logout */
              <div className="absolute left-full ml-4 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap z-9999 shadow-[0_10px_30px_rgba(0,0,0,0.3)] -translate-x-2.5 group-hover:translate-x-0 pointer-events-none">
                Logout
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-blue-600 rotate-45" />
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
}