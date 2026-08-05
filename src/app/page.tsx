"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/api";
import {
  clearStoredAdminToken,
  getStoredAdminToken,
  useAdminAuthGuard,
} from "@/lib/auth";

type LeadStatus = "new" | "contacted" | "converted";
type LeadSource = "contact" | "book-demo" | "welcome-modal";

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

const statusClassMap: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  contacted: "bg-sky-100 text-sky-800",
  converted: "bg-emerald-100 text-emerald-800",
};

const sourceClassMap: Record<string, string> = {
  contact: "bg-blue-100 text-blue-800",
  "book-demo": "bg-violet-100 text-violet-800",
  "welcome-modal": "bg-emerald-100 text-emerald-800",
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export default function DashboardPage() {
  const router = useRouter();
  const { isReady, token } = useAdminAuthGuard({
    requireToken: true,
    redirectPath: "/login",
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isReady || !token) {
      return;
    }

    const fetchLeads = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await authenticatedFetch<{ leads: Lead[] }>("/api/leads", {
          token,
        });

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

  const filteredLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...leads]
      .filter((lead) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [lead.fullName, lead.phone, lead.schoolName]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(normalizedSearch));

        const matchesSource =
          sourceFilter === "all" || lead.source?.toLowerCase() === sourceFilter;

        const matchesStatus =
          statusFilter === "all" || lead.status?.toLowerCase() === statusFilter;

        return matchesSearch && matchesSource && matchesStatus;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();
        return rightTime - leftTime;
      });
  }, [leads, search, sourceFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((lead) => lead.status?.toLowerCase() === "new").length;
    const contactedCount = leads.filter(
      (lead) => lead.status?.toLowerCase() === "contacted"
    ).length;
    const convertedCount = leads.filter(
      (lead) => lead.status?.toLowerCase() === "converted"
    ).length;

    return {
      total,
      newCount,
      contactedCount,
      convertedCount,
    };
  }, [leads]);

  const handleLogout = () => {
    clearStoredAdminToken();
    router.replace("/login");
  };

  const handleStatusChange = async (id: string, nextStatus: string) => {
    const originalStatus = leads.find((lead) => lead.id === id)?.status;
    setPendingStatusId(id);

    setLeads((current) =>
      current.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              status: nextStatus,
            }
          : lead
      )
    );

    try {
      const response = await authenticatedFetch<{ lead: Lead }>("/api/leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: nextStatus }),
        token,
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAdminToken();
          router.replace("/login");
          return;
        }

        setLeads((current) =>
          current.map((lead) =>
            lead.id === id
              ? {
                  ...lead,
                  status: originalStatus || "new",
                }
              : lead
          )
        );
        setError(response.error || "Unable to update the lead status.");
      }
    } catch {
      setLeads((current) =>
        current.map((lead) =>
          lead.id === id
            ? {
                ...lead,
                status: originalStatus || "new",
              }
            : lead
        )
      );
      setError("Network error while updating the lead status.");
    } finally {
      setPendingStatusId(null);
    }
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
              STEMSaathi
            </p>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              STEMSaathi Admin Dashboard
            </h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Leads", value: stats.total },
            { label: "New", value: stats.newCount },
            { label: "Contacted", value: stats.contactedCount },
            { label: "Converted", value: stats.convertedCount },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, phone or school"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Source</span>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All</option>
                <option value="contact">Contact</option>
                <option value="book-demo">Book Demo</option>
                <option value="welcome-modal">Welcome Modal</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
              </select>
            </label>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-xl bg-slate-100 px-4 py-3">
                  <div className="h-4 w-1/4 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-900">Something went wrong</p>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-900">No leads found</p>
              <p className="mt-2 text-sm text-slate-600">
                Try adjusting your search or filters to see more results.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">School/Org</th>
                      <th className="px-4 py-3 font-medium">City</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Enquiry Type</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{lead.fullName || "—"}</div>
                        </td>
                        <td className="px-4 py-4">
                          <a href={`tel:${lead.phone}`} className="text-blue-700 hover:underline">
                            {lead.phone || "—"}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{lead.schoolName || "—"}</td>
                        <td className="px-4 py-4 text-slate-700">{lead.city || "—"}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceClassMap[lead.source] || "bg-slate-100 text-slate-700"}`}>
                            {lead.source || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{lead.enquiryType || "—"}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassMap[lead.status?.toLowerCase()] || "bg-slate-100 text-slate-700"}`}>
                            {lead.status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{formatDate(lead.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <select
                              value={lead.status || "new"}
                              onChange={(event) => handleStatusChange(lead.id, event.target.value)}
                              disabled={pendingStatusId === lead.id}
                              className="rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="converted">Converted</option>
                            </select>

                            {lead.message ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedMessages((current) => ({
                                    ...current,
                                    [lead.id]: !current[lead.id],
                                  }))
                                }
                                className="text-left text-xs font-semibold text-blue-700 hover:underline"
                              >
                                {expandedMessages[lead.id] ? "Hide message" : "View message"}
                              </button>
                            ) : null}

                            {lead.message && expandedMessages[lead.id] ? (
                              <div className="max-w-xs rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                                {lead.message}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-4 md:hidden">
                {filteredLeads.map((lead) => (
                  <article key={lead.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">{lead.fullName || "—"}</h2>
                        <a href={`tel:${lead.phone}`} className="mt-1 inline-block text-sm text-blue-700 hover:underline">
                          {lead.phone || "—"}
                        </a>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassMap[lead.status?.toLowerCase()] || "bg-slate-100 text-slate-700"}`}>
                        {lead.status || "—"}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p><span className="font-medium text-slate-900">School:</span> {lead.schoolName || "—"}</p>
                      <p><span className="font-medium text-slate-900">City:</span> {lead.city || "—"}</p>
                      <p><span className="font-medium text-slate-900">Source:</span> {lead.source || "—"}</p>
                      <p><span className="font-medium text-slate-900">Enquiry:</span> {lead.enquiryType || "—"}</p>
                      <p><span className="font-medium text-slate-900">Date:</span> {formatDate(lead.createdAt)}</p>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <select
                        value={lead.status || "new"}
                        onChange={(event) => handleStatusChange(lead.id, event.target.value)}
                        disabled={pendingStatusId === lead.id}
                        className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                      </select>

                      {lead.message ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMessages((current) => ({
                              ...current,
                              [lead.id]: !current[lead.id],
                            }))
                          }
                          className="text-left text-sm font-semibold text-blue-700 hover:underline"
                        >
                          {expandedMessages[lead.id] ? "Hide message" : "View message"}
                        </button>
                      ) : null}

                      {lead.message && expandedMessages[lead.id] ? (
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                          {lead.message}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
