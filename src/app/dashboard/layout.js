"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/common/Sidebar';
import Navbar from '@/components/common/Navbar';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedUser = sessionStorage.getItem('currentUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        return;
      }

      const pending = sessionStorage.getItem('pendingRegistration');
      if (pending) {
        const parsed = JSON.parse(pending);
        setUser({
          name: parsed.companyName || parsed.name || parsed.email || 'User',
          email: parsed.email || '',
          organizationName: parsed.companyName || parsed.name || 'Organization',
          company_name: parsed.companyName || parsed.name || 'Organization',
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard user profile:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className={`transition-all duration-300 flex-1 flex flex-col ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'} w-full`}>
        <Navbar
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 p-8 overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
