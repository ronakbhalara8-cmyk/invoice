"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/common/Sidebar';
import Navbar from '@/components/common/Navbar';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // First check sessionStorage for cached user data
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setLoading(false);
          return;
        }

        // Try to fetch from API using JWT token cookie
        const response = await fetch('/api/auth/user');

        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            const userData = {
              id: result.data.userId,
              email: result.data.email,
              name: result.data.companyName || result.data.email || 'User',
              organizationName: result.data.organizationName || result.data.companyName || 'Organization',
              company_name: result.data.companyName,
              organizationId: result.data.organizationId,
            };
            setUser(userData);
            // Cache in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(userData));
          }
        } else {
          // Fallback to pendingRegistration in sessionStorage
          const pending = sessionStorage.getItem('pendingRegistration');
          if (pending) {
            const parsed = JSON.parse(pending);
            const userData = {
              name: parsed.companyName || parsed.name || parsed.email || 'User',
              email: parsed.email || '',
              organizationName: parsed.companyName || parsed.name || 'Organization',
              company_name: parsed.companyName || parsed.name || 'Organization',
            };
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        // Fallback to pendingRegistration
        try {
          const pending = sessionStorage.getItem('pendingRegistration');
          if (pending) {
            const parsed = JSON.parse(pending);
            const userData = {
              name: parsed.companyName || parsed.name || parsed.email || 'User',
              email: parsed.email || '',
              organizationName: parsed.companyName || parsed.name || 'Organization',
              company_name: parsed.companyName || parsed.name || 'Organization',
            };
            setUser(userData);
          }
        } catch (fallbackError) {
          console.error('Failed to load fallback user data:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      fetchUserData();
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
        <div className="flex-1 p-5 overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
