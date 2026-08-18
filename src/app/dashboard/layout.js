"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/common/Sidebar';
import Navbar from '@/components/common/Navbar';
import ProfileEditModal from '@/components/common/ProfileEditModal';

const parseJsonSafely = (value, fallback = null) => {
  if (typeof value !== 'string' || !value.trim()) return fallback;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Failed to parse stored JSON data:', error);
    return fallback;
  }
};

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Use cached user data as a quick fallback, but still refresh from the API
        const storedUser = parseJsonSafely(sessionStorage.getItem('currentUser'));
        if (storedUser) {
          setUser(storedUser);
        }

        // Try to fetch from API using JWT token cookie
        const response = await fetch('/api/auth/user');

        if (response.ok) {
          const text = await response.text();
          const result = text ? JSON.parse(text) : null;
          if (result?.data) {
            const userData = {
              id: result.data.userId,
              email: result.data.email,
              name: result.data.companyName || result.data.email || 'User',
              organizationName: result.data.organizationName || result.data.companyName || 'Organization',
              company_name: result.data.companyName,
              companyName: result.data.companyName,
              phone: result.data.phone || '',
              country: result.data.country || '',
              state: result.data.state || '',
              gstNumber: result.data.gstNumber || '',
              organizationId: result.data.organizationId,
            };
            setUser(userData);
            // Cache in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(userData));
          }
        } else {
          // Fallback to pendingRegistration in sessionStorage
          const pending = parseJsonSafely(sessionStorage.getItem('pendingRegistration'));
          if (pending) {
            const userData = {
              name: pending.companyName || pending.name || pending.email || 'User',
              email: pending.email || '',
              organizationName: pending.companyName || pending.name || 'Organization',
              company_name: pending.companyName || pending.name || 'Organization',
            };
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        // Fallback to pendingRegistration
        try {
          const pending = parseJsonSafely(sessionStorage.getItem('pendingRegistration'));
          if (pending) {
            const userData = {
              name: pending.companyName || pending.name || pending.email || 'User',
              email: pending.email || '',
              organizationName: pending.companyName || pending.name || 'Organization',
              company_name: pending.companyName || pending.name || 'Organization',
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

  // Disable scroll when profile panel is open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isProfilePanelOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isProfilePanelOpen]);

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
          onProfileClick={() => setIsProfilePanelOpen(true)}
        />
        <div className="flex-1 p-5 overflow-x-hidden">
          {children}
        </div>
      </div>

      {isProfilePanelOpen && (
        <ProfileEditModal
          user={user}
          onClose={() => setIsProfilePanelOpen(false)}
          onUserUpdate={(updatedUser) => {
            setUser(updatedUser);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
          }}
        />
      )}
    </div>
  );
}
