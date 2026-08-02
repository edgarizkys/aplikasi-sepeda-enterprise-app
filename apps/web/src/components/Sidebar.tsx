'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Bike,
  Users,
  Calendar,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  submenu?: SidebarItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const menuItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      label: 'Sepeda',
      href: '/bikes',
      icon: <Bike className="w-5 h-5" />,
      badge: 0,
      submenu: [
        { label: 'Daftar Sepeda', href: '/bikes', icon: <Bike className="w-4 h-4" /> },
        { label: 'Tambah Sepeda', href: '/bikes/create', icon: <Bike className="w-4 h-4" /> },
        {
          label: 'Ketersediaan',
          href: '/bikes/availability',
          icon: <Bike className="w-4 h-4" />,
        },
      ],
    },
    {
      label: 'Pengguna',
      href: '/riders',
      icon: <Users className="w-5 h-5" />,
      badge: 0,
      submenu: [
        { label: 'Daftar Pengguna', href: '/riders', icon: <Users className="w-4 h-4" /> },
        {
          label: 'Tambah Pengguna',
          href: '/riders/create',
          icon: <Users className="w-4 h-4" />,
        },
      ],
    },
    {
      label: 'Peminjaman',
      href: '/rentals',
      icon: <Calendar className="w-5 h-5" />,
      badge: 1,
      submenu: [
        { label: 'Daftar Peminjaman', href: '/rentals', icon: <Calendar className="w-4 h-4" /> },
        {
          label: 'Buat Peminjaman',
          href: '/rentals/create',
          icon: <Calendar className="w-4 h-4" />,
        },
        {
          label: 'Riwayat Peminjaman',
          href: '/rentals/history',
          icon: <Calendar className="w-4 h-4" />,
        },
      ],
    },
    {
      label: 'Pemeliharaan',
      href: '/maintenance',
      icon: <Wrench className="w-5 h-5" />,
      submenu: [
        {
          label: 'Daftar Pemeliharaan',
          href: '/maintenance',
          icon: <Wrench className="w-4 h-4" />,
        },
        {
          label: 'Jadwal Pemeliharaan',
          href: '/maintenance/schedule',
          icon: <Wrench className="w-4 h-4" />,
        },
        {
          label: 'Riwayat Pemeliharaan',
          href: '/maintenance/history',
          icon: <Wrench className="w-4 h-4" />,
        },
      ],
    },
    {
      label: 'Laporan',
      href: '/reports',
      icon: <BarChart3 className="w-5 h-5" />,
      submenu: [
        {
          label: 'Analisis Penggunaan',
          href: '/reports/usage',
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          label: 'Laporan Biaya',
          href: '/reports/costs',
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          label: 'Laporan Karyawan',
          href: '/reports/employees',
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ],
    },
    {
      label: 'Pengaturan',
      href: '/settings',
      icon: <Settings className="w-5 h-5" />,
      submenu: [
        { label: 'Profil', href: '/settings/profile', icon: <Settings className="w-4 h-4" /> },
        {
          label: 'Preferensi',
          href: '/settings/preferences',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const toggleSubmenu = (label: string) => {
    setExpandedMenu(expandedMenu === label ? null : label);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-red-600 to-orange-500 text-white transition-all duration-300 z-40 overflow-y-auto ${
          isOpen ? 'w-64' : 'w-0 lg:w-64'
        }`}
      >
        <div className="p-6 border-b border-orange-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Bike className="w-6 h-6 text-orange-500" />
            </div>
            {isOpen && (
              <div className="hidden lg:block">
                <h1 className="font-bold text-lg">Sepeda Enterprise</h1>
                <p className="text-xs text-orange-100">Fleet Management</p>
              </div>
            )}
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isItemActive = isActive(item.href);
            const isSubmenuExpanded = expandedMenu === item.label;

            return (
              <div key={item.label}>
                {hasSubmenu ? (
                  <button
                    onClick={() => toggleSubmenu(item.label)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-colors ${
                      isItemActive
                        ? 'bg-white bg-opacity-20 text-white'
                        : 'text-orange-50 hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="hidden lg:inline">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto lg:ml-2">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${isSubmenuExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-colors ${
                      isItemActive
                        ? 'bg-white bg-opacity-20 text-white'
                        : 'text-orange-50 hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="hidden lg:inline">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto lg:ml-2">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                )}

                {/* Submenu Items */}
                {hasSubmenu && isSubmenuExpanded && (
                  <div className="ml-4 mt-2 space-y-1 border-l border-orange-400">
                    {item.submenu.map((subitem) => (
                      <Link
                        key={subitem.label}
                        href={subitem.href}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors pl-6 ${
                          isActive(subitem.href)
                            ? 'bg-white bg-opacity-20 text-white'
                            : 'text-orange-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                        }`}
                      >
                        {subitem.icon}
                        <span className="hidden lg:inline">{subitem.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-4 border-t border-orange-400" />

        {/* Logout Button */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-orange-50 hover:bg-white hover:bg-opacity-10 font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:inline">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
        />
      )}

      {/* Content Offset */}
      <div className="hidden lg:block w-64" />
    </>
  );
}