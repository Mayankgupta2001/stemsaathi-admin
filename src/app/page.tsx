"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/api";
import { clearStoredAdminToken, useAdminAuthGuard } from "@/lib/auth";

type LeadStatus = "new" | "contacted" | "converted";
type LeadSource = "contact" | "book-demo" | "welcome-modal";
type OrderPaymentStatus = "pending_verification" | "verified" | "rejected";
type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";

type Lead = {
  id: string;
  source: LeadSource;
  fullName: string;
  phone: string;
  schoolName: string;
  city: string;
  enquiryType: string;
  message?: string;
  status: LeadStatus | string;
  createdAt: string;
};

type OrderItem = {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  customerName: string;
  phone: string;
  email?: string | null;
  schoolOrOrg?: string | null;
  address: string;
  items: OrderItem[];
  subtotal: number;
  gstAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentStatus: OrderPaymentStatus | string;
  orderStatus: OrderStatus | string;
  paymentProofNote?: string | null;
  createdAt: string;
};

const statusStyles: Record<string, { badge: string; dot: string }> = {
  new: { badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-amber-500" },
  contacted: { badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200", dot: "bg-sky-500" },
  converted: { badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
};

const sourceStyles: Record<string, string> = {
  contact: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "book-demo": "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  "welcome-modal": "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
};

const paymentStatusStyles: Record<string, string> = {
  pending_verification: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  verified: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const orderStatusStyles: Record<string, string> = {
  processing: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  shipped: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const initials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return (parts[0]?.[0] || "").concat(parts[1]?.[0] || "").toUpperCase();
};

const avatarPalette = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

const avatarColor = (name: string) => {
  const sum = [...(name || "?")].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return avatarPalette[sum % avatarPalette.length];
};

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${accent} opacity-[0.08]`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent} text-white shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isReady, token } = useAdminAuthGuard({
    requireToken: true,
    redirectPath: "/login",
  });

  const [activeTab, setActiveTab] = useState<"leads" | "orders">("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("all");
  const [pendingOrderUpdateId, setPendingOrderUpdateId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  useEffect(() => {
    if (!isReady || !token) return;

    const fetchLeads = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await authenticatedFetch<{ leads: Lead[] }>("/api/leads", { token });
        if (!response.ok) {
          if (response.status === 401) {
            clearStoredAdminToken();
            router.replace("/login");
            return;
          }
          setError(response.error || "Unable to load leads at the moment.");
          return;
        }
        setLeads(response.data?.leads ?? []);
      } catch {
        setError("Network error while loading leads.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [isReady, router, token]);

  useEffect(() => {
    if (!isReady || !token || activeTab !== "orders" || ordersLoaded) return;

    const fetchOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");
      try {
        const response = await authenticatedFetch<{ orders: Order[] }>("/api/orders", { token });
        if (!response.ok) {
          if (response.status === 401) {
            clearStoredAdminToken();
            router.replace("/login");
            return;
          }
          setOrdersError(response.error || "Unable to load orders at the moment.");
          return;
        }
        setOrders(response.data?.orders ?? []);
        setOrdersLoaded(true);
      } catch {
        setOrdersError("Network error while loading orders.");
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [activeTab, isReady, ordersLoaded, router, token]);

  const filteredLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return [...leads]
      .filter((lead) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [lead.fullName, lead.phone, lead.schoolName]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(normalizedSearch));
        const matchesSource = sourceFilter === "all" || lead.source?.toLowerCase() === sourceFilter;
        const matchesStatus = statusFilter === "all" || lead.status?.toLowerCase() === statusFilter;
        return matchesSearch && matchesSource && matchesStatus;
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [leads, search, sourceFilter, statusFilter]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = ordersSearch.trim().toLowerCase();
    return [...orders]
      .filter((order) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [order.customerName, order.phone]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(normalizedSearch));
        const matchesPayment = paymentFilter === "all" || order.paymentStatus?.toLowerCase() === paymentFilter;
        const matchesOrder = orderFilter === "all" || order.orderStatus?.toLowerCase() === orderFilter;
        return matchesSearch && matchesPayment && matchesOrder;
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [orders, ordersSearch, paymentFilter, orderFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((lead) => lead.status?.toLowerCase() === "new").length;
    const contactedCount = leads.filter((lead) => lead.status?.toLowerCase() === "contacted").length;
    const convertedCount = leads.filter((lead) => lead.status?.toLowerCase() === "converted").length;
    return { total, newCount, contactedCount, convertedCount };
  }, [leads]);

  const orderStats = useMemo(() => {
    const total = orders.length;
    const pendingVerification = orders.filter((order) => order.paymentStatus?.toLowerCase() === "pending_verification").length;
    const verified = orders.filter((order) => order.paymentStatus?.toLowerCase() === "verified").length;
    const delivered = orders.filter((order) => order.orderStatus?.toLowerCase() === "delivered").length;
    return { total, pendingVerification, verified, delivered };
  }, [orders]);

  const handleLogout = () => {
    clearStoredAdminToken();
    router.replace("/login");
  };

  const handleStatusChange = async (id: string, nextStatus: string) => {
    const originalStatus = leads.find((lead) => lead.id === id)?.status;
    setPendingStatusId(id);
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, status: nextStatus } : lead)));

    try {
      const response = await authenticatedFetch<{ lead: Lead }>("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
        token,
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAdminToken();
          router.replace("/login");
          return;
        }
        setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, status: originalStatus || "new" } : lead)));
        setError(response.error || "Unable to update the lead status.");
      }
    } catch {
      setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, status: originalStatus || "new" } : lead)));
      setError("Network error while updating the lead status.");
    } finally {
      setPendingStatusId(null);
    }
  };

  const handleOrderUpdate = async (id: string, field: "paymentStatus" | "orderStatus", nextValue: string) => {
    const originalOrder = orders.find((order) => order.id === id);
    setPendingOrderUpdateId(id);
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== id) return order;
        return { ...order, [field]: nextValue } as Order;
      })
    );

    try {
      const response = await authenticatedFetch<{ order: Order }>("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          field === "paymentStatus"
            ? { id, paymentStatus: nextValue }
            : { id, orderStatus: nextValue }
        ),
        token,
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAdminToken();
          router.replace("/login");
          return;
        }
        setOrders((current) =>
          current.map((order) => {
            if (order.id !== id) return order;
            return {
              ...order,
              [field]: originalOrder?.[field] || (field === "paymentStatus" ? "pending_verification" : "processing"),
            } as Order;
          })
        );
        setOrdersError(response.error || "Unable to update the order status.");
      }
    } catch {
      setOrders((current) =>
        current.map((order) => {
          if (order.id !== id) return order;
          return {
            ...order,
            [field]: originalOrder?.[field] || (field === "paymentStatus" ? "pending_verification" : "processing"),
          } as Order;
        })
      );
      setOrdersError("Network error while updating the order status.");
    } finally {
      setPendingOrderUpdateId(null);
    }
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-sm font-bold text-white shadow-sm">
              SS
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">STEMSaathi</p>
              <h1 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">Admin Dashboard</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="M13 14V15.5C13 16.33 12.33 17 11.5 17H5.5C4.67 17 4 16.33 4 15.5V4.5C4 3.67 4.67 3 5.5 3H11.5C12.33 3 13 3.67 13 4.5V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 10H17M17 10L14 7M17 10L14 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "leads" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Leads
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "orders" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Orders
          </button>
        </section>

        {activeTab === "leads" ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Leads" value={stats.total} accent="bg-indigo-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 10.5a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.6" /><path d="M4 16.5c0-2.76 2.69-5 6-5s6 2.24 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>} />
              <StatCard label="New" value={stats.newCount} accent="bg-amber-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="M10 6.5V10.5L12.5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
              <StatCard label="Contacted" value={stats.contactedCount} accent="bg-sky-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M3.5 5.5A1.5 1.5 0 015 4h10a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0115 13H8l-3.5 3V13H5a1.5 1.5 0 01-1.5-1.5v-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>} />
              <StatCard label="Converted" value={stats.convertedCount} accent="bg-emerald-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-3 lg:grid-cols-3">
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" /><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    </div>
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone or school" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15" />
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Source</span>
                  <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15">
                    <option value="all">All Sources</option>
                    <option value="contact">Contact</option>
                    <option value="book-demo">Book Demo</option>
                    <option value="welcome-modal">Welcome Modal</option>
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15">
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {isLoading ? (
                <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="animate-pulse rounded-xl bg-slate-100 px-4 py-4"><div className="h-4 w-1/4 rounded bg-slate-200" /></div>)}</div>
              ) : error ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50"><svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-rose-500"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10 6.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="13.3" r="0.9" fill="currentColor" /></svg></div>
                  <p className="text-lg font-semibold text-slate-900">Something went wrong</p>
                  <p className="mt-1 text-sm text-slate-600">{error}</p>
                  <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">Retry</button>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-slate-400"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" /><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></div>
                  <p className="text-lg font-semibold text-slate-900">No leads found</p>
                  <p className="mt-1 text-sm text-slate-600">Try adjusting your search or filters to see more results.</p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                      <thead className="bg-slate-50/80">
                        <tr>
                          {['Lead', 'Phone', 'School/Org', 'City', 'Source', 'Enquiry', 'Status', 'Date', 'Actions'].map((header) => (
                            <th key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredLeads.map((lead) => {
                          const statusKey = lead.status?.toLowerCase() || 'new';
                          const statusStyle = statusStyles[statusKey] || statusStyles.new;
                          return (
                            <tr key={lead.id} className="align-top transition hover:bg-slate-50/60">
                              <td className="px-4 py-4"><div className="flex items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(lead.fullName)}`}>{initials(lead.fullName)}</div><span className="font-semibold text-slate-900">{lead.fullName || '—'}</span></div></td>
                              <td className="px-4 py-4"><a href={`tel:${lead.phone}`} className="text-indigo-600 hover:underline">{lead.phone || '—'}</a></td>
                              <td className="px-4 py-4 text-slate-700">{lead.schoolName || '—'}</td>
                              <td className="px-4 py-4 text-slate-700">{lead.city || '—'}</td>
                              <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sourceStyles[lead.source] || 'bg-slate-100 text-slate-700'}`}>{lead.source || '—'}</span></td>
                              <td className="px-4 py-4 text-slate-700">{lead.enquiryType || '—'}</td>
                              <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />{lead.status || '—'}</span></td>
                              <td className="px-4 py-4 whitespace-nowrap text-slate-600">{formatDate(lead.createdAt)}</td>
                              <td className="px-4 py-4"><div className="flex flex-col gap-2"><select value={lead.status || 'new'} onChange={(event) => handleStatusChange(lead.id, event.target.value)} disabled={pendingStatusId === lead.id} className="rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"><option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option></select>{lead.message ? <button type="button" onClick={() => setExpandedMessages((current) => ({ ...current, [lead.id]: !current[lead.id] }))} className="text-left text-xs font-semibold text-indigo-600 hover:underline">{expandedMessages[lead.id] ? 'Hide message' : 'View message'}</button> : null}{lead.message && expandedMessages[lead.id] ? <div className="max-w-xs rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{lead.message}</div> : null}</div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid gap-4 p-4 md:hidden">
                    {filteredLeads.map((lead) => {
                      const statusKey = lead.status?.toLowerCase() || 'new';
                      const statusStyle = statusStyles[statusKey] || statusStyles.new;
                      return (
                        <article key={lead.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(lead.fullName)}`}>{initials(lead.fullName)}</div><div><h2 className="text-base font-semibold text-slate-900">{lead.fullName || '—'}</h2><a href={`tel:${lead.phone}`} className="text-sm text-indigo-600 hover:underline">{lead.phone || '—'}</a></div></div>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />{lead.status || '—'}</span>
                          </div>
                          <div className="mt-3 grid gap-1.5 text-sm text-slate-600">
                            <p><span className="font-medium text-slate-900">School:</span> {lead.schoolName || '—'}</p>
                            <p><span className="font-medium text-slate-900">City:</span> {lead.city || '—'}</p>
                            <p><span className="font-medium text-slate-900">Source:</span> <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${sourceStyles[lead.source] || 'bg-slate-100 text-slate-700'}`}>{lead.source || '—'}</span></p>
                            <p><span className="font-medium text-slate-900">Enquiry:</span> {lead.enquiryType || '—'}</p>
                            <p><span className="font-medium text-slate-900">Date:</span> {formatDate(lead.createdAt)}</p>
                          </div>
                          <div className="mt-4 flex flex-col gap-2"><select value={lead.status || 'new'} onChange={(event) => handleStatusChange(lead.id, event.target.value)} disabled={pendingStatusId === lead.id} className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"><option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option></select>{lead.message ? <button type="button" onClick={() => setExpandedMessages((current) => ({ ...current, [lead.id]: !current[lead.id] }))} className="text-left text-sm font-semibold text-indigo-600 hover:underline">{expandedMessages[lead.id] ? 'Hide message' : 'View message'}</button> : null}{lead.message && expandedMessages[lead.id] ? <div className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{lead.message}</div> : null}</div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Orders" value={orderStats.total} accent="bg-indigo-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 4.5h12l-1 7H5l-1-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M7 13.5h1.5M12 13.5h1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>} />
              <StatCard label="Pending Verification" value={orderStats.pendingVerification} accent="bg-amber-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 3.5v7l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" /></svg>} />
              <StatCard label="Verified" value={orderStats.verified} accent="bg-emerald-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
              <StatCard label="Delivered" value={orderStats.delivered} accent="bg-sky-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 6.5h10l2 3v4H4v-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="7.5" cy="13.5" r="1.2" fill="currentColor" /><circle cx="13.5" cy="13.5" r="1.2" fill="currentColor" /></svg>} />
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-3 lg:grid-cols-3">
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" /><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></div>
                    <input type="search" value={ordersSearch} onChange={(event) => setOrdersSearch(event.target.value)} placeholder="Customer or phone" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15" />
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Status</span>
                  <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15">
                    <option value="all">All</option>
                    <option value="pending_verification">Pending Verification</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Order Status</span>
                  <select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15">
                    <option value="all">All</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {ordersLoading ? (
                <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="animate-pulse rounded-xl bg-slate-100 px-4 py-4"><div className="h-4 w-1/4 rounded bg-slate-200" /></div>)}</div>
              ) : ordersError ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50"><svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-rose-500"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10 6.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="13.3" r="0.9" fill="currentColor" /></svg></div>
                  <p className="text-lg font-semibold text-slate-900">Something went wrong</p>
                  <p className="mt-1 text-sm text-slate-600">{ordersError}</p>
                  <button type="button" onClick={() => setOrdersLoaded(false)} className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">Retry</button>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-slate-400"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" /><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></div>
                  <p className="text-lg font-semibold text-slate-900">No orders found</p>
                  <p className="mt-1 text-sm text-slate-600">Try adjusting your search or filters to see more results.</p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                      <thead className="bg-slate-50/80">
                        <tr>
                          {['Customer', 'Phone', 'School/Org', 'Items', 'Total', 'Payment Status', 'Order Status', 'Proof/UTR', 'Date', 'Actions'].map((header) => (
                            <th key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredOrders.map((order) => {
                          const paymentKey = order.paymentStatus?.toLowerCase() || 'pending_verification';
                          const orderKey = order.orderStatus?.toLowerCase() || 'processing';
                          const paymentStyle = paymentStatusStyles[paymentKey] || paymentStatusStyles.pending_verification;
                          const orderStyle = orderStatusStyles[orderKey] || orderStatusStyles.processing;
                          return (
                            <tr key={order.id} className="align-top transition hover:bg-slate-50/60">
                              <td className="px-4 py-4"><div className="flex items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(order.customerName)}`}>{initials(order.customerName)}</div><div><p className="font-semibold text-slate-900">{order.customerName || '—'}</p><p className="text-xs text-slate-500">{order.email || '—'}</p></div></div></td>
                              <td className="px-4 py-4"><a href={`tel:${order.phone}`} className="text-indigo-600 hover:underline">{order.phone || '—'}</a></td>
                              <td className="px-4 py-4 text-slate-700">{order.schoolOrOrg || '—'}</td>
                              <td className="px-4 py-4"><div className="space-y-2"><div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-900">{order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'}</span><button type="button" onClick={() => setExpandedItems((current) => ({ ...current, [order.id]: !current[order.id] }))} className="text-xs font-semibold text-indigo-600 hover:underline">{expandedItems[order.id] ? 'Hide items' : 'View items'}</button></div>{expandedItems[order.id] ? <div className="max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{order.items?.map((item, index) => <div key={`${order.id}-${index}`} className="flex items-center justify-between gap-3 py-1"><span>{item.name || 'Unnamed item'}</span><span className="text-slate-500">{item.quantity} × {formatCurrency(item.price)}</span></div>)}</div> : null}</div></td>
                              <td className="px-4 py-4 whitespace-nowrap font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                              <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStyle}`}>{order.paymentStatus || '—'}</span></td>
                              <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStyle}`}>{order.orderStatus || '—'}</span></td>
                              <td className="px-4 py-4 text-slate-700">{order.paymentProofNote || '—'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-slate-600">{formatDate(order.createdAt)}</td>
                              <td className="px-4 py-4"><div className="flex flex-col gap-2"><select value={order.paymentStatus || 'pending_verification'} onChange={(event) => handleOrderUpdate(order.id, 'paymentStatus', event.target.value)} disabled={pendingOrderUpdateId === order.id} className="rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"><option value="pending_verification">Pending Verification</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select><select value={order.orderStatus || 'processing'} onChange={(event) => handleOrderUpdate(order.id, 'orderStatus', event.target.value)} disabled={pendingOrderUpdateId === order.id} className="rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid gap-4 p-4 md:hidden">
                    {filteredOrders.map((order) => {
                      const paymentKey = order.paymentStatus?.toLowerCase() || 'pending_verification';
                      const orderKey = order.orderStatus?.toLowerCase() || 'processing';
                      const paymentStyle = paymentStatusStyles[paymentKey] || paymentStatusStyles.pending_verification;
                      const orderStyle = orderStatusStyles[orderKey] || orderStatusStyles.processing;
                      return (
                        <article key={order.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(order.customerName)}`}>{initials(order.customerName)}</div><div><h2 className="text-base font-semibold text-slate-900">{order.customerName || '—'}</h2><a href={`tel:${order.phone}`} className="text-sm text-indigo-600 hover:underline">{order.phone || '—'}</a></div></div><div className="flex flex-col gap-2"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStyle}`}>{order.paymentStatus || '—'}</span><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStyle}`}>{order.orderStatus || '—'}</span></div></div>
                          <div className="mt-3 grid gap-1.5 text-sm text-slate-600"><p><span className="font-medium text-slate-900">School/Org:</span> {order.schoolOrOrg || '—'}</p><p><span className="font-medium text-slate-900">Total:</span> {formatCurrency(order.totalAmount)}</p><p><span className="font-medium text-slate-900">Proof/UTR:</span> {order.paymentProofNote || '—'}</p><p><span className="font-medium text-slate-900">Date:</span> {formatDate(order.createdAt)}</p></div>
                          <div className="mt-3 space-y-2"><div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-900">{order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'}</span><button type="button" onClick={() => setExpandedItems((current) => ({ ...current, [order.id]: !current[order.id] }))} className="text-xs font-semibold text-indigo-600 hover:underline">{expandedItems[order.id] ? 'Hide items' : 'View items'}</button></div>{expandedItems[order.id] ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{order.items?.map((item, index) => <div key={`${order.id}-${index}`} className="flex items-center justify-between gap-3 py-1"><span>{item.name || 'Unnamed item'}</span><span className="text-slate-500">{item.quantity} × {formatCurrency(item.price)}</span></div>)}</div> : null}</div>
                          <div className="mt-4 flex flex-col gap-2"><select value={order.paymentStatus || 'pending_verification'} onChange={(event) => handleOrderUpdate(order.id, 'paymentStatus', event.target.value)} disabled={pendingOrderUpdateId === order.id} className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"><option value="pending_verification">Pending Verification</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select><select value={order.orderStatus || 'processing'} onChange={(event) => handleOrderUpdate(order.id, 'orderStatus', event.target.value)} disabled={pendingOrderUpdateId === order.id} className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
