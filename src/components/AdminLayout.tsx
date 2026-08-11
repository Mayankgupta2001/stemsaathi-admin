"use client";

import { useState, type ReactNode } from "react";

type TabValue = "dashboard" | "leads" | "orders" | "products";

const navItems: { value: TabValue; label: string; icon: ReactNode }[] = [
  {
    value: "dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <rect x="3" y="3" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="10.5" y="3" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3" y="10.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    value: "leads",
    label: "Leads",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <circle cx="7" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="14" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 16c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 16c0-1.9 1.3-3.4 3-3.4s3 1.5 3 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "orders",
    label: "Orders",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <path d="M5 6h10l-1 8H6L5 6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M7.5 6V5a2.5 2.5 0 015 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "products",
    label: "Products",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <path d="M10 3l6.5 3.5v7L10 17l-6.5-3.5v-7L10 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M3.5 6.5L10 10l6.5-3.5M10 10v7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function Sidebar({
  activeTab,
  onSelect,
  onClose,
  isMobileOverlay = false,
}: {
  activeTab: TabValue;
  onSelect: (tab: TabValue) => void;
  onClose?: () => void;
  isMobileOverlay?: boolean;
}) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-teal text-sm font-bold text-white shadow-sm">
            SS
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">STEMSaathi</p>
            <p className="text-[11px] font-medium text-slate-400">Admin Panel</p>
          </div>
        </div>
        {isMobileOverlay ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = activeTab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                onSelect(item.value);
                onClose?.();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-brand-blue text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-[11px] text-slate-400">STEMSaathi © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

export default function AdminLayout({
  activeTab,
  onTabChange,
  onLogout,
  children,
}: {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar activeTab={activeTab} onSelect={onTabChange} />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-2xl">
            <Sidebar
              activeTab={activeTab}
              onSelect={onTabChange}
              onClose={() => setIsMobileMenuOpen(false)}
              isMobileOverlay
            />
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>

            <div className="relative hidden flex-1 max-w-md sm:block">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <input
                type="search"
                placeholder="Search leads, orders, products..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/15"
              />
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
              <button
                type="button"
                className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Notifications"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                  <path
                    d="M5 8a5 5 0 0110 0c0 3.5 1.2 4.5 1.2 4.5H3.8S5 11.5 5 8z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path d="M8.3 15a1.7 1.7 0 003.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-amber" />
              </button>

              <button
                type="button"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Mail"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                  <rect x="3" y="5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3.5 6l6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-teal text-sm font-bold text-white shadow-sm"
                  aria-label="Profile menu"
                >
                  A
                </button>

                {isProfileOpen ? (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsProfileOpen(false)} />
                    <div className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-100 px-3.5 py-2.5">
                        <p className="text-xs font-semibold text-slate-900">Admin</p>
                        <p className="text-[11px] text-slate-400">STEMSaathi</p>
                      </div>
                      <button
                        type="button"
                        onClick={onLogout}
                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                          <path
                            d="M13 14V15.5C13 16.33 12.33 17 11.5 17H5.5C4.67 17 4 16.33 4 15.5V4.5C4 3.67 4.67 3 5.5 3H11.5C12.33 3 13 3.67 13 4.5V6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M8 10H17M17 10L14 7M17 10L14 13"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}