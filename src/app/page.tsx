"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/api";
import { clearStoredAdminToken, useAdminAuthGuard } from "@/lib/auth";
import AdminLayout from "@/components/AdminLayout";
import ProductImportModal from "@/components/ProductImportModal";
import ProductDeleteConfirmModal from "@/components/ProductDeleteConfirmModal";
import { exportProductsToSpreadsheet } from "@/lib/product-import";
import { calculatePrices } from "@/lib/pricing";

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

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number | null;
  images: string[];
  rating?: number;
  reviewCount?: number;
  badge?: string | null;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProductFormState = {
  name: string;
  description: string;
  category: string;
  price: string;
  originalPrice: string;
  imagesText: string;
  stock: string;
  badge: string;
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

const productCategories = [
  "Electronic Components",
  "3D Printers & Parts",
  "Sensors",
  "Drones & Parts",
  "Mechanical Tools",
  "STEM Kits",
  "Robotics Kits",
  "Science Lab Material",
  "Chemistry Lab Material",
  "Biology Lab Material",
];

const createEmptyProductForm = (): ProductFormState => ({
  name: "",
  description: "",
  category: "",
  price: "",
  originalPrice: "",
  imagesText: "",
  stock: "100",
  badge: "",
});

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

function SimpleBarChart({
  title,
  data,
  colors,
}: {
  title: string;
  data: { label: string; value: number }[];
  colors: string[];
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{item.label}</span>
              <span className="font-bold text-slate-900">{item.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: colors[index % colors.length],
                }}
              />
            </div>
          </div>
        ))}
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

  const [activeTab, setActiveTab] = useState<"dashboard" | "leads" | "orders" | "products">("dashboard");
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
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productsSearch, setProductsSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormMode, setProductFormMode] = useState<"create" | "edit">("create");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(createEmptyProductForm);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [pendingProductToggleId, setPendingProductToggleId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Bulk operations & modal states
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingProducts, setIsDeletingProducts] = useState(false);
  const [productsToDelete, setProductsToDelete] = useState<Product[]>([]);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    if (!isReady || !token || ordersLoaded) return;

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

  useEffect(() => {
    if (!isReady || !token || productsLoaded) return;

    const fetchProducts = async () => {
      setProductsLoading(true);
      setProductsError("");
      try {
        const response = await authenticatedFetch<{ products: Product[] }>("/api/products", { token });
        if (!response.ok) {
          if (response.status === 401) {
            clearStoredAdminToken();
            router.replace("/login");
            return;
          }
          setProductsError(response.error || "Unable to load products at the moment.");
          return;
        }
        setProducts(response.data?.products ?? []);
        setProductsLoaded(true);
      } catch {
        setProductsError("Network error while loading products.");
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [activeTab, isReady, productsLoaded, router, token]);

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

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  }, [orders]);

  const leadsBySource = useMemo(() => {
    const counts: Record<string, number> = { contact: 0, "book-demo": 0, "welcome-modal": 0 };
    leads.forEach((lead) => {
      const key = lead.source?.toLowerCase();
      if (key && counts[key] !== undefined) counts[key]++;
    });
    return counts;
  }, [leads]);

  const ordersByPayment = useMemo(() => {
    const counts: Record<string, number> = { pending_verification: 0, verified: 0, rejected: 0 };
    orders.forEach((order) => {
      const key = order.paymentStatus?.toLowerCase();
      if (key && counts[key] !== undefined) counts[key]++;
    });
    return counts;
  }, [orders]);

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [leads]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [orders]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = productsSearch.trim().toLowerCase();
    return [...products]
      .filter((product) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [product.name, product.description, product.category]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(normalizedSearch));
        const matchesCategory = productCategoryFilter === "all" || product.category?.toLowerCase() === productCategoryFilter.toLowerCase();
        return matchesSearch && matchesCategory;
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [products, productsSearch, productCategoryFilter]);

  const productStats = useMemo(() => {
    const total = products.length;
    const active = products.filter((product) => product.isActive).length;
    const inactive = products.filter((product) => !product.isActive).length;
    const lowStock = products.filter((product) => product.stock < 10).length;
    return { total, active, inactive, lowStock };
  }, [products]);

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

  const openCreateProductModal = () => {
    setProductFormMode("create");
    setEditingProductId(null);
    setProductForm(createEmptyProductForm());
    setIsProductFormOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setProductFormMode("edit");
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: String(product.price),
      originalPrice: product.originalPrice ? String(product.originalPrice) : "",
      imagesText: product.images?.join(", ") || "",
      stock: String(product.stock),
      badge: product.badge || "",
    });
    setIsProductFormOpen(true);
  };

  const handleProductImageUpload = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const files = Array.from(event.target.files || []);

  if (files.length === 0) return;

  setImageUploading(true);
  setProductsError("");

  try {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAdminToken();
          router.replace("/login");
          return;
        }

        throw new Error(data?.error || "Image upload failed.");
      }

      if (data?.url) {
        uploadedUrls.push(data.url);
      }
    }

    if (uploadedUrls.length > 0) {
      setProductForm((current) => ({
        ...current,
        imagesText: [...current.imagesText.split(","), ...uploadedUrls]
          .map((item) => item.trim())
          .filter(Boolean)
          .join(", "),
      }));
    }
  } catch (error) {
    console.error("Image upload error:", error);

    setProductsError(
      error instanceof Error
        ? error.message
        : "Failed to upload product image."
    );
  } finally {
    setImageUploading(false);

    // Allow selecting the same file again
    event.target.value = "";
  }
};

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProductSubmitting(true);
    setProductsError("");

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      category: productForm.category.trim(),
      price: Number(productForm.price),
      originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : null,
      images: productForm.imagesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      stock: Number(productForm.stock || 100),
      badge: productForm.badge.trim() || null,
    };

    try {
      const response = await authenticatedFetch<{ product: Product }> ("/api/products", {
        method: productFormMode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productFormMode === "create" ? payload : { id: editingProductId, ...payload }),
        token,
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAdminToken();
          router.replace("/login");
          return;
        }
        setProductsError(response.error || "Unable to save the product.");
        return;
      }

      const savedProduct = response.data?.product;
      if (!savedProduct) {
        setProductsError("The product could not be saved.");
        return;
      }

      setProducts((current) => {
        if (productFormMode === "create") {
          return [savedProduct, ...current];
        }
        return current.map((product) => (product.id === savedProduct.id ? savedProduct : product));
      });

      setIsProductFormOpen(false);
      setProductForm(createEmptyProductForm());
      setEditingProductId(null);
    } catch {
      setProductsError("Network error while saving the product.");
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleProductToggle = async (id: string, nextValue: boolean) => {
    const originalProduct = products.find((product) => product.id === id);
    setPendingProductToggleId(id);
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, isActive: nextValue } : product)));

    try {
      const response = await authenticatedFetch<{ product: Product }> ("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: nextValue }),
        token,
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAdminToken();
          router.replace("/login");
          return;
        }
        setProducts((current) => current.map((product) => (product.id === id ? { ...product, isActive: originalProduct?.isActive ?? true } : product)));
        setProductsError(response.error || "Unable to update the product status.");
      }
    } catch {
      setProducts((current) => current.map((product) => (product.id === id ? { ...product, isActive: originalProduct?.isActive ?? true } : product)));
      setProductsError("Network error while updating the product status.");
    } finally {
      setPendingProductToggleId(null);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleSelectAllProducts = (checked: boolean, productList: Product[]) => {
    if (checked) {
      setSelectedProductIds(productList.map((p) => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleOpenSingleDeleteModal = (product: Product) => {
    setProductsToDelete([product]);
    setIsDeleteModalOpen(true);
  };

  const handleOpenBulkDeleteModal = () => {
    const selected = products.filter((p) => selectedProductIds.includes(p.id));
    if (selected.length === 0) return;
    setProductsToDelete(selected);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (productsToDelete.length === 0) return;
    setIsDeletingProducts(true);
    setProductsError("");

    const idsToDelete = productsToDelete.map((p) => p.id);
    const originalProducts = [...products];

    try {
      const response = await authenticatedFetch<{ success: boolean; count: number; deletedIds: string[] }>(
        "/api/products",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: idsToDelete }),
          token,
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAdminToken();
          router.replace("/login");
          return;
        }
        setProductsError(response.error || "Unable to delete selected product(s).");
        return;
      }

      setProducts((current) => current.filter((p) => !idsToDelete.includes(p.id)));
      setSelectedProductIds((current) => current.filter((id) => !idsToDelete.includes(id)));
      setIsDeleteModalOpen(false);
      setProductsToDelete([]);
      showToast(`Successfully deleted ${idsToDelete.length} product(s) from database.`);
    } catch {
      setProducts(originalProducts);
      setProductsError("Network error while deleting product(s).");
    } finally {
      setIsDeletingProducts(false);
    }
  };

  const handleExport = (format: "xlsx" | "csv") => {
    setExportDropdownOpen(false);
    if (products.length === 0) {
      setProductsError("No products available to export.");
      return;
    }

    try {
      const { data, filename, mimeType } = exportProductsToSpreadsheet(products, format);
      const blob = new Blob([data as BlobPart], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      showToast(`Exported ${products.length} products as ${format.toUpperCase()}.`);
    } catch (err) {
      setProductsError("Failed to export products: " + (err as Error).message);
    }
  };

  const handleImportSuccess = (message: string) => {
    setProductsLoaded(false); // triggers fetchProducts reload
    showToast(message);
  };

  const handleAutoCalculateMRP = () => {
    if (!productForm.price) return;
    const { originalPrice } = calculatePrices(productForm.price);
    setProductForm((prev) => ({
      ...prev,
      originalPrice: String(originalPrice),
    }));
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}>
        {activeTab === "dashboard" ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Leads" value={stats.total} accent="bg-brand-blue" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 10.5a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.6" /><path d="M4 16.5c0-2.76 2.69-5 6-5s6 2.24 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>} />
              <StatCard label="Total Orders" value={orderStats.total} accent="bg-brand-teal" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 4.5h12l-1 7H5l-1-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>} />
              <StatCard label="Total Revenue" value={totalRevenue} accent="bg-brand-amber" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="M10 6.5v7M7.5 8.5h4a1.5 1.5 0 010 3h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>} />
              <StatCard label="Total Products" value={productStats.total} accent="bg-emerald-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 3l6.5 3.5v7L10 17l-6.5-3.5v-7L10 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>} />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <SimpleBarChart
                title="Leads by Source"
                data={[
                  { label: "Contact", value: leadsBySource["contact"] },
                  { label: "Book Demo", value: leadsBySource["book-demo"] },
                  { label: "Welcome Modal", value: leadsBySource["welcome-modal"] },
                ]}
                colors={["#3B4CFF", "#8B5CF6", "#17C3B2"]}
              />
              <SimpleBarChart
                title="Orders by Payment Status"
                data={[
                  { label: "Pending Verification", value: ordersByPayment["pending_verification"] },
                  { label: "Verified", value: ordersByPayment["verified"] },
                  { label: "Rejected", value: ordersByPayment["rejected"] },
                ]}
                colors={["#F5A524", "#10B981", "#F43F5E"]}
              />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Recent Leads</h3>
                  <button type="button" onClick={() => setActiveTab("leads")} className="text-xs font-semibold text-brand-blue hover:underline">View All</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {recentLeads.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-slate-500">No leads yet.</p>
                  ) : (
                    recentLeads.map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(lead.fullName)}`}>{initials(lead.fullName)}</div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{lead.fullName || "—"}</p>
                            <p className="text-xs text-slate-500">{lead.source}</p>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyles[lead.status?.toLowerCase()]?.badge || "bg-slate-100 text-slate-700"}`}>{lead.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Recent Orders</h3>
                  <button type="button" onClick={() => setActiveTab("orders")} className="text-xs font-semibold text-brand-blue hover:underline">View All</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {recentOrders.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-slate-500">No orders yet.</p>
                  ) : (
                    recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(order.customerName)}`}>{initials(order.customerName)}</div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{order.customerName || "—"}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(order.totalAmount)}</p>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentStatusStyles[order.paymentStatus?.toLowerCase()] || "bg-slate-100 text-slate-700"}`}>{order.paymentStatus}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        ) : activeTab === "leads" ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Leads" value={stats.total} accent="bg-brand-blue" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 10.5a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.6" /><path d="M4 16.5c0-2.76 2.69-5 6-5s6 2.24 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>} />
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
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone or school" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" />
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Source</span>
                  <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15">
                    <option value="all">All Sources</option>
                    <option value="contact">Contact</option>
                    <option value="book-demo">Book Demo</option>
                    <option value="welcome-modal">Welcome Modal</option>
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15">
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
                  <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">Retry</button>
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
                              <td className="px-4 py-4"><a href={`tel:${lead.phone}`} className="text-brand-blue hover:underline">{lead.phone || '—'}</a></td>
                              <td className="px-4 py-4 text-slate-700">{lead.schoolName || '—'}</td>
                              <td className="px-4 py-4 text-slate-700">{lead.city || '—'}</td>
                              <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sourceStyles[lead.source] || 'bg-slate-100 text-slate-700'}`}>{lead.source || '—'}</span></td>
                              <td className="px-4 py-4 text-slate-700">{lead.enquiryType || '—'}</td>
                              <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />{lead.status || '—'}</span></td>
                              <td className="px-4 py-4 whitespace-nowrap text-slate-600">{formatDate(lead.createdAt)}</td>
                              <td className="px-4 py-4"><div className="flex flex-col gap-2"><select value={lead.status || 'new'} onChange={(event) => handleStatusChange(lead.id, event.target.value)} disabled={pendingStatusId === lead.id} className="rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"><option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option></select>{lead.message ? <button type="button" onClick={() => setExpandedMessages((current) => ({ ...current, [lead.id]: !current[lead.id] }))} className="text-left text-xs font-semibold text-brand-blue hover:underline">{expandedMessages[lead.id] ? 'Hide message' : 'View message'}</button> : null}{lead.message && expandedMessages[lead.id] ? <div className="max-w-xs rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{lead.message}</div> : null}</div></td>
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
                            <div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(lead.fullName)}`}>{initials(lead.fullName)}</div><div><h2 className="text-base font-semibold text-slate-900">{lead.fullName || '—'}</h2><a href={`tel:${lead.phone}`} className="text-sm text-brand-blue hover:underline">{lead.phone || '—'}</a></div></div>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />{lead.status || '—'}</span>
                          </div>
                          <div className="mt-3 grid gap-1.5 text-sm text-slate-600">
                            <p><span className="font-medium text-slate-900">School:</span> {lead.schoolName || '—'}</p>
                            <p><span className="font-medium text-slate-900">City:</span> {lead.city || '—'}</p>
                            <p><span className="font-medium text-slate-900">Source:</span> <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${sourceStyles[lead.source] || 'bg-slate-100 text-slate-700'}`}>{lead.source || '—'}</span></p>
                            <p><span className="font-medium text-slate-900">Enquiry:</span> {lead.enquiryType || '—'}</p>
                            <p><span className="font-medium text-slate-900">Date:</span> {formatDate(lead.createdAt)}</p>
                          </div>
                          <div className="mt-4 flex flex-col gap-2"><select value={lead.status || 'new'} onChange={(event) => handleStatusChange(lead.id, event.target.value)} disabled={pendingStatusId === lead.id} className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"><option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option></select>{lead.message ? <button type="button" onClick={() => setExpandedMessages((current) => ({ ...current, [lead.id]: !current[lead.id] }))} className="text-left text-sm font-semibold text-brand-blue hover:underline">{expandedMessages[lead.id] ? 'Hide message' : 'View message'}</button> : null}{lead.message && expandedMessages[lead.id] ? <div className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{lead.message}</div> : null}</div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </>
        ) : activeTab === "products" ? (
          <>
            {/* Stats Cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Products" value={productStats.total} accent="bg-brand-blue" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4.5 5.5A1.5 1.5 0 016 4h8a1.5 1.5 0 011.5 1.5v2A1.5 1.5 0 0114 9H6A1.5 1.5 0 014.5 7.5v-2z" stroke="currentColor" strokeWidth="1.6" /><path d="M4.5 10.5A1.5 1.5 0 016 9h8a1.5 1.5 0 011.5 1.5v2A1.5 1.5 0 0114 14H6a1.5 1.5 0 01-1.5-1.5v-2z" stroke="currentColor" strokeWidth="1.6" /></svg>} />
              <StatCard label="Active" value={productStats.active} accent="bg-emerald-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
              <StatCard label="Inactive" value={productStats.inactive} accent="bg-slate-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M13.5 6.5L6.5 13.5M6.5 6.5L13.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>} />
              <StatCard label="Low Stock" value={productStats.lowStock} accent="bg-amber-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 3.5v7l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" /></svg>} />
            </section>

            {/* Filter & Actions Bar */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" /><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></div>
                      <input type="search" value={productsSearch} onChange={(event) => setProductsSearch(event.target.value)} placeholder="Name, description or category" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" />
                    </div>
                  </div>
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
                    <select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15">
                      <option value="all">All Categories</option>
                      {productCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-500">
                      <path d="M10 3.5v9M6.5 9.5L10 13l3.5-3.5M4 14.5v1a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Import Products
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setExportDropdownOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-500">
                        <path d="M10 12.5v-9M6.5 6.5L10 3l3.5 3.5M4 14.5v1a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Export
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400">
                        <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {exportDropdownOpen ? (
                      <div className="absolute right-0 z-20 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                        <button
                          type="button"
                          onClick={() => handleExport("xlsx")}
                          className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-blue"
                        >
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">XLSX</span>
                          Excel Spreadsheet
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExport("csv")}
                          className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-blue"
                        >
                          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">CSV</span>
                          CSV File
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={openCreateProductModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Add Product
                  </button>
                </div>
              </div>
            </section>

            {/* Products Table Section */}
            <section className="relative mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {productsLoading ? (
                <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="animate-pulse rounded-xl bg-slate-100 px-4 py-4"><div className="h-4 w-1/4 rounded bg-slate-200" /></div>)}</div>
              ) : productsError ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50"><svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-rose-500"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10 6.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="13.3" r="0.9" fill="currentColor" /></svg></div>
                  <p className="text-lg font-semibold text-slate-900">Something went wrong</p>
                  <p className="mt-1 text-sm text-slate-600">{productsError}</p>
                  <button type="button" onClick={() => { setProductsLoaded(false); setProductsError(""); }} className="mt-4 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">Retry</button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-slate-400"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" /><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></div>
                  <p className="text-lg font-semibold text-slate-900">No products found</p>
                  <p className="mt-1 text-sm text-slate-600">Try adjusting your search or filters, or import products from your catalog.</p>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                  >
                    Import Products Spreadsheet
                  </button>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                      <thead className="bg-slate-50/80">
                        <tr>
                          <th className="w-12 px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.includes(p.id))}
                              onChange={(e) => handleSelectAllProducts(e.target.checked, filteredProducts)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                              title="Select all on this view"
                            />
                          </th>
                          {['Product', 'Category', 'Price & MRP', 'Stock', 'Status', 'Actions'].map((header) => (
                            <th key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredProducts.map((product) => {
                          const isSelected = selectedProductIds.includes(product.id);
                          const isLowStock = product.stock < 10;
                          const stockClasses = isLowStock ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
                          const statusClasses = product.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
                          return (
                            <tr key={product.id} className={`align-top transition ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/60'}`}>
                              <td className="w-12 px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectProduct(product.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                    {product.images?.[0] ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" /> : <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-slate-400"><path d="M4 4.5h12v11H4z" stroke="currentColor" strokeWidth="1.4" /><path d="M7 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16 13.5l-3-3-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900">{product.name || '—'}</p>
                                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{product.description || '—'}</p>
                                    {product.badge ? (
                                      <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                        {product.badge}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{product.category || '—'}</span></td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-900">{formatCurrency(product.price)}</span>
                                  {product.originalPrice && product.originalPrice > product.price ? (
                                    <span className="text-xs text-slate-400 line-through">MRP: {formatCurrency(product.originalPrice)}</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stockClasses}`}>{product.stock} in stock</span></td>
                              <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses}`}>{product.isActive ? 'Active' : 'Inactive'}</span></td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-1.5">
                                  <button type="button" onClick={() => openEditProductModal(product)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Edit</button>
                                  <button type="button" onClick={() => handleProductToggle(product.id, !product.isActive)} disabled={pendingProductToggleId === product.id} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">{product.isActive ? 'Deactivate' : 'Activate'}</button>
                                  <button type="button" onClick={() => handleOpenSingleDeleteModal(product)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Delete</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List */}
                  <div className="grid gap-4 p-4 md:hidden">
                    {filteredProducts.map((product) => {
                      const isSelected = selectedProductIds.includes(product.id);
                      const isLowStock = product.stock < 10;
                      const stockClasses = isLowStock ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
                      const statusClasses = product.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
                      return (
                        <article key={product.id} className={`rounded-2xl border p-4 shadow-sm transition ${isSelected ? 'border-brand-blue bg-indigo-50/40' : 'border-slate-200 bg-white'}`}>
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectProduct(product.id)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
                            />
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                              {product.images?.[0] ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" /> : <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-slate-400"><path d="M4 4.5h12v11H4z" stroke="currentColor" strokeWidth="1.4" /><path d="M7 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16 13.5l-3-3-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h2 className="text-base font-semibold text-slate-900">{product.name || '—'}</h2>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.description || '—'}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-1.5 text-sm text-slate-600">
                            <p><span className="font-medium text-slate-900">Category:</span> {product.category || '—'}</p>
                            <p><span className="font-medium text-slate-900">Price:</span> {formatCurrency(product.price)}{product.originalPrice && product.originalPrice > product.price ? <span className="ml-2 text-slate-400 line-through">MRP: {formatCurrency(product.originalPrice)}</span> : null}</p>
                            <p><span className="font-medium text-slate-900">Stock:</span> <span className={`ml-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stockClasses}`}>{product.stock} in stock</span></p>
                            <p><span className="font-medium text-slate-900">Status:</span> <span className={`ml-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses}`}>{product.isActive ? 'Active' : 'Inactive'}</span></p>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={() => openEditProductModal(product)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Edit</button>
                            <button type="button" onClick={() => handleProductToggle(product.id, !product.isActive)} disabled={pendingProductToggleId === product.id} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">{product.isActive ? 'Deactivate' : 'Activate'}</button>
                            <button type="button" onClick={() => handleOpenSingleDeleteModal(product)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">Delete</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* Floating Bulk Action Bar */}
            {selectedProductIds.length > 0 ? (
              <div className="sticky bottom-4 z-30 mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3.5 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
                    {selectedProductIds.length}
                  </span>
                  <span className="text-sm font-medium">
                    {selectedProductIds.length === 1 ? "1 product selected" : `${selectedProductIds.length} products selected`}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedProductIds([])}
                    className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenBulkDeleteModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <path d="M4 6h12M7 6V4a1 1 0 011-1h4a1 1 0 011 1v2m2 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2V6h10z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Delete Selected ({selectedProductIds.length})
                  </button>
                </div>
              </div>
            ) : null}

            {/* Add / Edit Product Modal */}
            {isProductFormOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{productFormMode === "create" ? "Add New Product" : "Edit Product"}</h3>
                      <p className="mt-1 text-sm text-slate-600">Fill in the product details below.</p>
                    </div>
                    <button type="button" onClick={() => setIsProductFormOpen(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Close</button>
                  </div>

                  <form onSubmit={handleProductSubmit} className="mt-5 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-1.5 text-sm font-medium text-slate-700">
                        <span>Name</span>
                        <input required value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" placeholder="Product name" />
                      </label>
                      <label className="space-y-1.5 text-sm font-medium text-slate-700">
                        <span>Category</span>
                        <select required value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15">
                          <option value="">Select category</option>
                          {productCategories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                      <span>Description</span>
                      <textarea required rows={3} value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" placeholder="Add product description" />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-1.5 text-sm font-medium text-slate-700">
                        <span>Selling Price (₹)</span>
                        <input required type="number" min="0" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" placeholder="0" />
                      </label>
                      <div className="space-y-1.5 text-sm font-medium text-slate-700">
                        <div className="flex items-center justify-between">
                          <span>Original Price / MRP (₹)</span>
                          {productForm.price ? (
                            <button
                              type="button"
                              onClick={handleAutoCalculateMRP}
                              className="text-xs font-semibold text-brand-blue hover:underline"
                            >
                              Auto-Suggest MRP
                            </button>
                          ) : null}
                        </div>
                        <input type="number" min="0" value={productForm.originalPrice} onChange={(event) => setProductForm((current) => ({ ...current, originalPrice: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" placeholder="0" />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
  <div className="space-y-3">
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>Product Image(s)</span>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleProductImageUpload}
          disabled={imageUploading || productSubmitting}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90 disabled:cursor-not-allowed"
        />

        <p className="mt-2 text-xs text-slate-500">
          JPG, PNG or WEBP • Maximum 10 MB per image
        </p>

        {imageUploading ? (
          <p className="mt-2 text-sm font-medium text-brand-blue">
            Uploading image(s) to Cloudinary...
          </p>
        ) : null}
      </div>
    </label>

    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>Image URL(s)</span>

      <textarea
        rows={3}
        value={productForm.imagesText}
        onChange={(event) =>
          setProductForm((current) => ({
            ...current,
            imagesText: event.target.value,
          }))
        }
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
        placeholder="Cloudinary URLs will appear here..."
      />

      <p className="text-xs text-slate-500">
        You can upload images above or manually enter image URLs separated by
        commas.
      </p>
    </label>
  </div>

  <label className="space-y-1.5 text-sm font-medium text-slate-700">
    <span>Stock quantity</span>

    <input
      required
      type="number"
      min="0"
      value={productForm.stock}
      onChange={(event) =>
        setProductForm((current) => ({
          ...current,
          stock: event.target.value,
        }))
      }
      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
      placeholder="100"
    />
  </label>
</div>

                    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                      <span>Badge (optional)</span>
                      <input value={productForm.badge} onChange={(event) => setProductForm((current) => ({ ...current, badge: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" placeholder="Best Seller, Popular, etc." />
                    </label>

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                      <button type="button" onClick={() => setIsProductFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                      <button
  type="submit"
  disabled={productSubmitting || imageUploading} className="rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                        {imageUploading
  ? "Uploading..."
  : productSubmitting
    ? "Saving..."
    : productFormMode === "create"
      ? "Create Product"
      : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}

            {/* Product Import Modal */}
            <ProductImportModal
              isOpen={isImportModalOpen}
              onClose={() => setIsImportModalOpen(false)}
              onSuccess={handleImportSuccess}
              token={token}
              categories={productCategories}
              existingProducts={products.map((p) => ({ id: p.id, name: p.name, category: p.category }))}
            />

            {/* Product Delete Confirmation Modal */}
            <ProductDeleteConfirmModal
              isOpen={isDeleteModalOpen}
              onClose={() => {
                setIsDeleteModalOpen(false);
                setProductsToDelete([]);
              }}
              onConfirm={handleConfirmDelete}
              products={productsToDelete}
              isLoading={isDeletingProducts}
            />

            {/* Toast Notification */}
            {toastMessage ? (
              <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-emerald-400">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{toastMessage}</span>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Orders" value={orderStats.total} accent="bg-brand-blue" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 4.5h12l-1 7H5l-1-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M7 13.5h1.5M12 13.5h1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>} />
              <StatCard label="Pending Verification" value={orderStats.pendingVerification} accent="bg-amber-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 3.5v7l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" /></svg>} />
              <StatCard label="Verified" value={orderStats.verified} accent="bg-emerald-500" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
              <StatCard label="Delivered" value={orderStats.delivered} accent="bg-brand-teal" icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 6.5h10l2 3v4H4v-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="7.5" cy="13.5" r="1.2" fill="currentColor" /><circle cx="13.5" cy="13.5" r="1.2" fill="currentColor" /></svg>} />
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-3 lg:grid-cols-3">
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" /><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></div>
                    <input type="search" value={ordersSearch} onChange={(event) => setOrdersSearch(event.target.value)} placeholder="Customer or phone" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" />
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Status</span>
                  <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15">
                    <option value="all">All</option>
                    <option value="pending_verification">Pending Verification</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Order Status</span>
                  <select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15">
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
                  <button type="button" onClick={() => setOrdersLoaded(false)} className="mt-4 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">Retry</button>
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
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(order.customerName)}`}>
                                    {initials(order.customerName)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900">{order.customerName || '—'}</p>
                                    <p className="text-xs text-slate-500">{order.email || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <a href={`tel:${order.phone}`} className="text-brand-blue hover:underline">{order.phone || '—'}</a>
                              </td>
                              <td className="px-4 py-4 text-slate-700">{order.schoolOrOrg || '—'}</td>
                              <td className="px-4 py-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-900">{order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'}</span>
                                    <button type="button" onClick={() => setExpandedItems((current) => ({ ...current, [order.id]: !current[order.id] }))} className="text-xs font-semibold text-brand-blue hover:underline">
                                      {expandedItems[order.id] ? 'Hide items' : 'View items'}
                                    </button>
                                  </div>
                                  {expandedItems[order.id] && (
                                    <div className="max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                                      {order.items?.map((item, index) => (
                                        <div key={`${order.id}-${index}`} className="flex items-center justify-between gap-3 py-1">
                                          <span>{item.name || 'Unnamed item'}</span>
                                          <span className="text-slate-500">{item.quantity} × {formatCurrency(item.price)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStyle}`}>{order.paymentStatus || '—'}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStyle}`}>{order.orderStatus || '—'}</span>
                              </td>
                              <td className="px-4 py-4 text-slate-700">{order.paymentProofNote || '—'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-slate-600">{formatDate(order.createdAt)}</td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-2">
                                  <button type="button" onClick={() => setViewingOrder(order)} className="rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-2 py-1.5 text-xs font-semibold text-brand-blue transition hover:bg-brand-blue/10">View Details</button>
                                  <select value={order.paymentStatus || 'pending_verification'} onChange={(event) => handleOrderUpdate(order.id, 'paymentStatus', event.target.value)} disabled={pendingOrderUpdateId === order.id} className="rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15">
                                    <option value="pending_verification">Pending Verification</option>
                                    <option value="verified">Verified</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                  <select value={order.orderStatus || 'processing'} onChange={(event) => handleOrderUpdate(order.id, 'orderStatus', event.target.value)} disabled={pendingOrderUpdateId === order.id} className="rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15">
                                    <option value="processing">Processing</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </div>
                              </td>
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
                          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(order.customerName)}`}>{initials(order.customerName)}</div><div><h2 className="text-base font-semibold text-slate-900">{order.customerName || '—'}</h2><a href={`tel:${order.phone}`} className="text-sm text-brand-blue hover:underline">{order.phone || '—'}</a></div></div><div className="flex flex-col gap-2"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStyle}`}>{order.paymentStatus || '—'}</span><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStyle}`}>{order.orderStatus || '—'}</span></div></div>
                          <div className="mt-3 grid gap-1.5 text-sm text-slate-600"><p><span className="font-medium text-slate-900">School/Org:</span> {order.schoolOrOrg || '—'}</p><p><span className="font-medium text-slate-900">Total:</span> {formatCurrency(order.totalAmount)}</p><p><span className="font-medium text-slate-900">Proof/UTR:</span> {order.paymentProofNote || '—'}</p><p><span className="font-medium text-slate-900">Date:</span> {formatDate(order.createdAt)}</p></div>
                          <div className="mt-3 space-y-2"><div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-900">{order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'}</span><button type="button" onClick={() => setExpandedItems((current) => ({ ...current, [order.id]: !current[order.id] }))} className="text-xs font-semibold text-brand-blue hover:underline">{expandedItems[order.id] ? 'Hide items' : 'View items'}</button></div>{expandedItems[order.id] ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{order.items?.map((item, index) => <div key={`${order.id}-${index}`} className="flex items-center justify-between gap-3 py-1"><span>{item.name || 'Unnamed item'}</span><span className="text-slate-500">{item.quantity} × {formatCurrency(item.price)}</span></div>)}</div> : null}</div>
                          <div className="mt-4 flex flex-col gap-2"><button type="button" onClick={() => setViewingOrder(order)} className="rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-2.5 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-blue/10">View Details</button><select value={order.paymentStatus || 'pending_verification'} onChange={(event) => handleOrderUpdate(order.id, 'paymentStatus', event.target.value)} disabled={pendingOrderUpdateId === order.id} className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"><option value="pending_verification">Pending Verification</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select><select value={order.orderStatus || 'processing'} onChange={(event) => handleOrderUpdate(order.id, 'orderStatus', event.target.value)} disabled={pendingOrderUpdateId === order.id} className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>                        
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {viewingOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Order Details</h3>
                <p className="mt-1 text-sm text-slate-500">Order ID: {viewingOrder.id}</p>
              </div>
              <button type="button" onClick={() => setViewingOrder(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Close</button>
            </div>

            <div className="mt-5 grid gap-5">
              {/* Customer Info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Information</h4>
                <div className="grid gap-2.5 text-sm sm:grid-cols-2">
                  <p><span className="font-medium text-slate-900">Name:</span> <span className="text-slate-700">{viewingOrder.customerName || "—"}</span></p>
                  <p><span className="font-medium text-slate-900">Phone:</span> <a href={`tel:${viewingOrder.phone}`} className="text-brand-blue hover:underline">{viewingOrder.phone || "—"}</a></p>
                  <p><span className="font-medium text-slate-900">Email:</span> <span className="text-slate-700">{viewingOrder.email || "—"}</span></p>
                  <p><span className="font-medium text-slate-900">School/Org:</span> <span className="text-slate-700">{viewingOrder.schoolOrOrg || "—"}</span></p>
                  <p className="sm:col-span-2"><span className="font-medium text-slate-900">Address:</span> <span className="text-slate-700">{viewingOrder.address || "—"}</span></p>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Items ({viewingOrder.items?.length || 0})</h4>
                <div className="divide-y divide-slate-100">
                  {viewingOrder.items?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm font-medium text-slate-900">{item.name || "Unnamed item"}</span>
                      <span className="text-sm text-slate-600">{item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(viewingOrder.subtotal)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>GST</span><span>{formatCurrency(viewingOrder.gstAmount)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Delivery Fee</span><span>{viewingOrder.deliveryFee > 0 ? formatCurrency(viewingOrder.deliveryFee) : "FREE"}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-900"><span>Total</span><span>{formatCurrency(viewingOrder.totalAmount)}</span></div>
                </div>
              </div>

              {/* Payment & Status */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment & Fulfillment</h4>
                <div className="grid gap-2.5 text-sm sm:grid-cols-2">
                  <p><span className="font-medium text-slate-900">Payment Status:</span> <span className={`ml-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatusStyles[viewingOrder.paymentStatus?.toLowerCase()] || "bg-slate-100 text-slate-700"}`}>{viewingOrder.paymentStatus}</span></p>
                  <p><span className="font-medium text-slate-900">Order Status:</span> <span className={`ml-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${orderStatusStyles[viewingOrder.orderStatus?.toLowerCase()] || "bg-slate-100 text-slate-700"}`}>{viewingOrder.orderStatus}</span></p>
                  <p><span className="font-medium text-slate-900">UTR/Reference:</span> <span className="text-slate-700">{viewingOrder.paymentProofNote || "—"}</span></p>
                  <p><span className="font-medium text-slate-900">Order Date:</span> <span className="text-slate-700">{formatDate(viewingOrder.createdAt)}</span></p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setViewingOrder(null)} className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">Close</button>
            </div>
          </div>
        </div>
      ) : null}

    </AdminLayout>
  );
}