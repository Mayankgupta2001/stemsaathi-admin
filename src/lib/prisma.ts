import { PrismaClient } from "@prisma/client";

export interface MockLeadRecord {
  id: string;
  source: string;
  fullName: string;
  phone: string;
  schoolName: string | null;
  city: string | null;
  enquiryType: string | null;
  message: string | null;
  status: string;
  createdAt: string;
}

export interface MockProductRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  rating: number;
  reviewCount: number;
  badge: string | null;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockOrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface MockOrderRecord {
  id: string;
  customerName: string;
  phone: string;
  email: string | null;
  schoolOrOrg: string | null;
  address: string;
  items: MockOrderItem[];
  subtotal: number;
  gstAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  paymentProofNote: string | null;
  createdAt: string;
}

interface PrismaGlobalStore {
  prisma?: PrismaClient;
  __inMemoryLeads?: MockLeadRecord[];
  __inMemoryProducts?: MockProductRecord[];
  __inMemoryOrders?: MockOrderRecord[];
}

const globalForPrisma = globalThis as unknown as PrismaGlobalStore;

// Initial seed data for offline mock development mode ONLY (active when MOCK_DATABASE=true in development)
const initialLeads: MockLeadRecord[] = [
  {
    id: "lead_1",
    source: "book-demo",
    fullName: "Dr. Rajesh Sharma",
    phone: "+91 98765 43210",
    schoolName: "Delhi Public School, R.K. Puram",
    city: "New Delhi",
    enquiryType: "Robotics Lab Setup",
    message: "We want to set up an advanced STEM and Robotics lab for grades 6 to 10 starting this academic session.",
    status: "new",
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "lead_2",
    source: "contact",
    fullName: "Sunita Verma",
    phone: "+91 98112 23344",
    schoolName: "St. Xavier's High School",
    city: "Mumbai",
    enquiryType: "Curriculum Kits",
    message: "Interested in bulk pricing for 3D printer kits and science lab experiment kits.",
    status: "contacted",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "lead_3",
    source: "welcome-modal",
    fullName: "Amit Patel",
    phone: "+91 97234 56789",
    schoolName: "Greenwood International Academy",
    city: "Bengaluru",
    enquiryType: "Teacher Training & Workshop",
    message: "Looking for 2-day hands-on teacher training for drone and IoT kits.",
    status: "converted",
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: "lead_4",
    source: "contact",
    fullName: "Pooja Hegde",
    phone: "+91 94455 66778",
    schoolName: "National Public School",
    city: "Hyderabad",
    enquiryType: "STEM Lab Material",
    message: "Need quote for 50 electronic sensor kits and soldering workstations.",
    status: "new",
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  },
];

const initialProducts: MockProductRecord[] = [
  {
    id: "prod_1",
    name: "Advanced Arduino Starter Kit (IoT & Sensors)",
    description: "Complete beginner-to-advanced kit with Arduino Uno R3, 30+ sensors, LCD display, servo motors, and step-by-step experiment manual.",
    category: "STEM Kits",
    price: 2499,
    originalPrice: 3499,
    images: ["https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=600&q=80"],
    rating: 4.8,
    reviewCount: 42,
    badge: "Bestseller",
    stock: 120,
    isActive: true,
    createdAt: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
  },
  {
    id: "prod_2",
    name: "STEMSaathi Mini Quadcopter Drone Assembly Kit",
    description: "Educational DIY quadcopter kit with flight controller board, telemetry module, propellers, and safety guards for aerial robotics training.",
    category: "Drones & Parts",
    price: 4999,
    originalPrice: 6500,
    images: ["https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=600&q=80"],
    rating: 4.9,
    reviewCount: 28,
    badge: "Featured",
    stock: 45,
    isActive: true,
    createdAt: new Date(Date.now() - 15 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
  },
  {
    id: "prod_3",
    name: "Precision Desktop 3D Printer for Schools",
    description: "Enclosed, safe FDM 3D printer with auto-bed leveling, touchscreen UI, PLA spool, and curriculum-aligned 3D modeling guides.",
    category: "3D Printers & Parts",
    price: 28999,
    originalPrice: 34999,
    images: ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"],
    rating: 4.7,
    reviewCount: 16,
    badge: "Lab Essential",
    stock: 8,
    isActive: true,
    createdAt: new Date(Date.now() - 20 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
  },
  {
    id: "prod_4",
    name: "Comprehensive Biology Microscope & Prepared Slides Lab",
    description: "Compound binocular microscope (40x - 1000x magnification) with LED illumination, 100 prepared biology specimen slides, and blank slides kit.",
    category: "Biology Lab Material",
    price: 8500,
    originalPrice: 10500,
    images: ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"],
    rating: 4.9,
    reviewCount: 35,
    badge: "High Demand",
    stock: 25,
    isActive: true,
    createdAt: new Date(Date.now() - 25 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
  {
    id: "prod_5",
    name: "Complete Chemistry Lab Glassware & Reagent Kit",
    description: "Borosilicate beakers, conical flasks, test tube rack, spirit lamp, safety goggles, and curated reagent solutions for school practicals.",
    category: "Chemistry Lab Material",
    price: 6200,
    originalPrice: 7500,
    images: ["https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80"],
    rating: 4.6,
    reviewCount: 19,
    badge: null,
    stock: 30,
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
  },
];

const initialOrders: MockOrderRecord[] = [
  {
    id: "ord_101",
    customerName: "Principal Anjali Nair",
    phone: "+91 99887 76655",
    email: "principal@kvdelhi.edu.in",
    schoolOrOrg: "Kendriya Vidyalaya No. 1",
    address: "Sector 8, R.K. Puram, New Delhi, 110022",
    items: [
      {
        productId: "prod_1",
        name: "Advanced Arduino Starter Kit (IoT & Sensors)",
        price: 2499,
        quantity: 10,
      },
      {
        productId: "prod_2",
        name: "STEMSaathi Mini Quadcopter Drone Assembly Kit",
        price: 4999,
        quantity: 2,
      },
    ],
    subtotal: 34988,
    gstAmount: 6298,
    deliveryFee: 0,
    totalAmount: 41286,
    paymentStatus: "verified",
    orderStatus: "shipped",
    paymentProofNote: "NEFT Ref: UTIBR520240812001 - HDFC Bank School Account",
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: "ord_102",
    customerName: "Prof. Vikram Chandra",
    phone: "+91 98450 12345",
    email: "stemlab@bhavans.ac.in",
    schoolOrOrg: "Bharatiya Vidya Bhavan",
    address: "Race Course Road, Bengaluru, Karnataka, 560001",
    items: [
      {
        productId: "prod_3",
        name: "Precision Desktop 3D Printer for Schools",
        price: 28999,
        quantity: 1,
      },
    ],
    subtotal: 28999,
    gstAmount: 5220,
    deliveryFee: 0,
    totalAmount: 34219,
    paymentStatus: "pending_verification",
    orderStatus: "processing",
    paymentProofNote: "UPI Txn ID: 422910394821 - Submitted via payment gateway",
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: "ord_103",
    customerName: "Meenakshi Sundaram",
    phone: "+91 97890 54321",
    email: "admin@chectinad.edu.in",
    schoolOrOrg: "Chettinad Vidyashram",
    address: "R.A. Puram, Chennai, Tamil Nadu, 600028",
    items: [
      {
        productId: "prod_4",
        name: "Comprehensive Biology Microscope & Prepared Slides Lab",
        price: 8500,
        quantity: 4,
      },
      {
        productId: "prod_5",
        name: "Complete Chemistry Lab Glassware & Reagent Kit",
        price: 6200,
        quantity: 2,
      },
    ],
    subtotal: 46400,
    gstAmount: 8352,
    deliveryFee: 0,
    totalAmount: 54752,
    paymentStatus: "verified",
    orderStatus: "delivered",
    paymentProofNote: "Cheque No. 440918 cleared on 14 Aug",
    createdAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
];

// In-memory collections stored on globalThis for development mock mode
const inMemoryLeads: MockLeadRecord[] = globalForPrisma.__inMemoryLeads || [...initialLeads];
const inMemoryProducts: MockProductRecord[] = globalForPrisma.__inMemoryProducts || [...initialProducts];
const inMemoryOrders: MockOrderRecord[] = globalForPrisma.__inMemoryOrders || [...initialOrders];

globalForPrisma.__inMemoryLeads = inMemoryLeads;
globalForPrisma.__inMemoryProducts = inMemoryProducts;
globalForPrisma.__inMemoryOrders = inMemoryOrders;

// Mock implementations for offline development testing (MOCK_DATABASE=true)
const mockLead = {
  findMany: async (args?: { orderBy?: { createdAt?: "asc" | "desc" } }) => {
    const result = [...inMemoryLeads];
    if (args?.orderBy?.createdAt === "desc") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  },
  findUnique: async (args: { where: { id: string } }) => {
    return inMemoryLeads.find((l) => l.id === args.where.id) || null;
  },
  create: async (args: { data: Partial<MockLeadRecord> }) => {
    const newLead: MockLeadRecord = {
      id: args.data.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      source: args.data.source || "contact",
      fullName: args.data.fullName || "",
      phone: args.data.phone || "",
      schoolName: args.data.schoolName ?? null,
      city: args.data.city ?? null,
      enquiryType: args.data.enquiryType ?? null,
      message: args.data.message ?? null,
      status: args.data.status || "new",
      createdAt: new Date().toISOString(),
      ...args.data,
    };
    inMemoryLeads.unshift(newLead);
    return newLead;
  },
  update: async (args: { where: { id: string }; data: Partial<MockLeadRecord> }) => {
    const id = args.where.id;
    const index = inMemoryLeads.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Lead with id ${id} not found`);
    }
    inMemoryLeads[index] = { ...inMemoryLeads[index], ...args.data };
    return inMemoryLeads[index];
  },
  delete: async (args: { where: { id: string } }) => {
    const id = args.where.id;
    const index = inMemoryLeads.findIndex((l) => l.id === id);
    if (index !== -1) {
      const deleted = inMemoryLeads.splice(index, 1)[0];
      return deleted;
    }
    return {};
  },
};

const mockProduct = {
  findMany: async (args?: { orderBy?: { createdAt?: "asc" | "desc" } }) => {
    const result = [...inMemoryProducts];
    if (args?.orderBy?.createdAt === "desc") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  },
  findUnique: async (args: { where: { id: string } }) => {
    return inMemoryProducts.find((p) => p.id === args.where.id) || null;
  },
  create: async (args: { data: Partial<MockProductRecord> }) => {
    const newProduct: MockProductRecord = {
      id: args.data.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: args.data.name || "",
      description: args.data.description || "",
      category: args.data.category || "",
      price: args.data.price || 0,
      originalPrice: args.data.originalPrice ?? null,
      images: args.data.images || [],
      rating: args.data.rating ?? 4.5,
      reviewCount: args.data.reviewCount ?? 0,
      badge: args.data.badge ?? null,
      stock: args.data.stock ?? 100,
      isActive: args.data.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...args.data,
    };
    inMemoryProducts.unshift(newProduct);
    return newProduct;
  },
  update: async (args: { where: { id: string }; data: Partial<MockProductRecord> }) => {
    const id = args.where.id;
    const index = inMemoryProducts.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Product with id ${id} not found`);
    }
    inMemoryProducts[index] = {
      ...inMemoryProducts[index],
      ...args.data,
      updatedAt: new Date().toISOString(),
    };
    return inMemoryProducts[index];
  },
  delete: async (args: { where: { id: string } }) => {
    const id = args.where.id;
    const index = inMemoryProducts.findIndex((p) => p.id === id);
    if (index !== -1) {
      const deleted = inMemoryProducts.splice(index, 1)[0];
      return deleted;
    }
    return {};
  },
  deleteMany: async (args?: { where?: { id?: { in?: string[] } | string } }) => {
    if (args?.where?.id) {
      if (typeof args.where.id === "string") {
        const targetId = args.where.id;
        const index = inMemoryProducts.findIndex((p) => p.id === targetId);
        if (index !== -1) {
          inMemoryProducts.splice(index, 1);
          return { count: 1 };
        }
        return { count: 0 };
      }
      if (args.where.id.in) {
        const ids = new Set(args.where.id.in);
        let count = 0;
        for (let i = inMemoryProducts.length - 1; i >= 0; i--) {
          if (ids.has(inMemoryProducts[i].id)) {
            inMemoryProducts.splice(i, 1);
            count++;
          }
        }
        return { count };
      }
    }
    const count = inMemoryProducts.length;
    inMemoryProducts.length = 0;
    return { count };
  },
  createMany: async (args: { data: Partial<MockProductRecord>[] }) => {
    const created: MockProductRecord[] = [];
    for (const item of args.data) {
      const newProduct: MockProductRecord = {
        id: item.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: item.name || "",
        description: item.description || "",
        category: item.category || "Electronic Components",
        price: item.price || 0,
        originalPrice: item.originalPrice ?? null,
        images: item.images || [],
        rating: item.rating ?? 4.5,
        reviewCount: item.reviewCount ?? 0,
        badge: item.badge ?? null,
        stock: item.stock ?? 100,
        isActive: item.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...item,
      };
      inMemoryProducts.unshift(newProduct);
      created.push(newProduct);
    }
    return { count: created.length };
  },
};

const mockOrder = {
  findMany: async (args?: { orderBy?: { createdAt?: "asc" | "desc" } }) => {
    const result = [...inMemoryOrders];
    if (args?.orderBy?.createdAt === "desc") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  },
  findUnique: async (args: { where: { id: string } }) => {
    return inMemoryOrders.find((o) => o.id === args.where.id) || null;
  },
  create: async (args: { data: Partial<MockOrderRecord> }) => {
    const newOrder: MockOrderRecord = {
      id: args.data.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerName: args.data.customerName || "",
      phone: args.data.phone || "",
      email: args.data.email ?? null,
      schoolOrOrg: args.data.schoolOrOrg ?? null,
      address: args.data.address || "",
      items: args.data.items || [],
      subtotal: args.data.subtotal || 0,
      gstAmount: args.data.gstAmount || 0,
      deliveryFee: args.data.deliveryFee ?? 0,
      totalAmount: args.data.totalAmount || 0,
      paymentStatus: args.data.paymentStatus || "pending_verification",
      orderStatus: args.data.orderStatus || "processing",
      paymentProofNote: args.data.paymentProofNote ?? null,
      createdAt: new Date().toISOString(),
      ...args.data,
    };
    inMemoryOrders.unshift(newOrder);
    return newOrder;
  },
  update: async (args: { where: { id: string }; data: Partial<MockOrderRecord> }) => {
    const id = args.where.id;
    const index = inMemoryOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      throw new Error(`Order with id ${id} not found`);
    }
    inMemoryOrders[index] = { ...inMemoryOrders[index], ...args.data };
    return inMemoryOrders[index];
  },
  delete: async (args: { where: { id: string } }) => {
    const id = args.where.id;
    const index = inMemoryOrders.findIndex((o) => o.id === id);
    if (index !== -1) {
      const deleted = inMemoryOrders.splice(index, 1)[0];
      return deleted;
    }
    return {};
  },
};

/**
 * Resolves the database client dynamically per request.
 * - In Production: strictly requires DATABASE_URL, initializes real PrismaClient, fails fast if missing.
 * - In Development: uses real PrismaClient if DATABASE_URL exists; uses mock only if MOCK_DATABASE=true is explicitly set; otherwise throws a helpful configuration error.
 */
function resolveClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === "production";
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
  const isExplicitMockRequested = process.env.MOCK_DATABASE === "true";

  // 1. PRODUCTION: Strict real PostgreSQL connection
  if (isProduction) {
    if (!hasDatabaseUrl) {
      throw new Error(
        "[STEMSaathi Production Error] DATABASE_URL environment variable is required in production. " +
        "Please configure DATABASE_URL with your Neon PostgreSQL connection string. Mock mode is strictly forbidden in production."
      );
    }
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        log: ["error"],
      });
    }
    return globalForPrisma.prisma;
  }

  // 2. DEVELOPMENT with DATABASE_URL: Connect to real Neon database
  if (hasDatabaseUrl) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        log: ["query", "error", "warn"],
      });
    }
    return globalForPrisma.prisma;
  }

  // 3. DEVELOPMENT with explicit MOCK_DATABASE=true
  if (isExplicitMockRequested) {
    console.warn(
      "[STEMSaathi Dev Warning] DATABASE_URL is not set, but MOCK_DATABASE=true is explicitly enabled. " +
      "Running in OFFLINE MOCK MODE. Data will NOT persist to Neon PostgreSQL."
    );
    return {
      lead: mockLead,
      product: mockProduct,
      order: mockOrder,
    } as unknown as PrismaClient;
  }

  // 4. DEVELOPMENT without DATABASE_URL and without MOCK_DATABASE=true: Fail fast with clear instructions
  throw new Error(
    "[STEMSaathi Configuration Error] DATABASE_URL is missing. " +
    "To connect to Neon PostgreSQL, set DATABASE_URL in your environment. " +
    "If you want to run offline mock testing in development, set MOCK_DATABASE=true explicitly."
  );
}

// Export lazy proxy so module evaluation during build/type-check does not crash before runtime
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === "then" || prop === Symbol.toStringTag) {
      return undefined;
    }
    const client = resolveClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
