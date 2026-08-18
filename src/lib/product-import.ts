import * as XLSX from "xlsx";
import { calculatePrices, type PricingResult } from "@/lib/pricing";

export interface ParsedProductRow {
  rowNumber: number;
  rawName: string;
  name: string;
  category: string;
  description: string;
  rawCostPrice: number | string;
  pricing: PricingResult;
  images: string[];
  stock: number;
  badge?: string | null;
  imageMapped: boolean;
  imageWarning?: string;
  status: "ready" | "duplicate" | "warning" | "invalid";
  statusReason?: string;
  existingProductId?: string;
}

export interface ExistingProductReference {
  id: string;
  name: string;
  category: string;
}

export interface ImportSummary {
  total: number;
  ready: number;
  duplicates: number;
  warnings: number;
  invalid: number;
  categoryCounts: Record<string, number>;
}

// Normalized string for duplicate detection
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Column aliases to match flexible Excel formats
const NAME_ALIASES = [
  "product name",
  "product",
  "item name",
  "item",
  "name",
  "title",
  "component",
  "product_name",
  "item_name",
  "components",
  "electronic component",
  "product title",
  "p1 package: electronic development, robotics, internet of things and sensors & stem kits",
];

const COST_PRICE_ALIASES = [
  "cost price",
  "cost",
  "price",
  "rate",
  "unit price",
  "buying price",
  "purchase price",
  "cost_price",
  "unit cost",
  "amount",
  "cost(inr)",
  "cost (inr)",
  "price (inr)",
  "rate (inr)",
];

const CATEGORY_ALIASES = [
  "category",
  "package",
  "type",
  "cat",
  "group",
  "product category",
  "category name",
  "section",
];

const DESCRIPTION_ALIASES = [
  "description",
  "desc",
  "details",
  "specification",
  "specifications",
  "specs",
  "info",
  "additional information",
  "extra information",
  "additional info",
  "accessories",
  "included",
  "remarks",
  "features",
  "notes",
];

const STOCK_ALIASES = [
  "stock",
  "quantity",
  "qty",
  "stock quantity",
  "units",
  "inventory",
  "available",
  "stock count",
];

const IMAGE_ALIASES = [
  "image",
  "image url",
  "image_url",
  "image name",
  "image filename",
  "filename",
  "img",
  "photo",
  "images",
  "picture",
];

const BADGE_ALIASES = [
  "badge",
  "tag",
  "highlight",
  "label",
  "badge text",
];

function findColumnValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const matchedKey = keys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === alias.replace(/[^a-z0-9]/g, "")
    );
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== "") {
      return row[matchedKey];
    }
  }
  return undefined;
}

/**
 * Helper to encode URL components strictly conforming to STEMSaathi Shop specifications
 */
function strictUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

/**
 * Generate safe, properly URL-encoded STEMSaathi image path
 */
export function buildProductImagePath(category: string, filenameOrName: string): string {
  if (!filenameOrName || !filenameOrName.trim()) {
    return "";
  }

  const trimmed = filenameOrName.trim();

  // If already a full URL or absolute path
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return encodeURI(trimmed);
  }

  // Clean filename
  const cleanFilename = trimmed.endsWith(".jpg") || trimmed.endsWith(".jpeg") || trimmed.endsWith(".png") || trimmed.endsWith(".webp")
    ? trimmed
    : `${trimmed}.jpg`;

  // Encode folder and filename properly for special characters (spaces %20, commas %2C, plus %2B, parentheses %28 %29)
  const encodedCategory = strictUrlEncode(category || "Electronic Components");
  const encodedFilename = strictUrlEncode(cleanFilename);

  return `/images/${encodedCategory}/${encodedFilename}`;
}

/**
 * Parse uploaded Excel or CSV buffer/arrayBuffer into standardized preview rows
 */
export function parseProductSpreadsheet(
  fileBuffer: ArrayBuffer | Uint8Array,
  options: {
    defaultCategory?: string;
    existingProducts?: ExistingProductReference[];
  } = {}
): {
  rows: ParsedProductRow[];
  summary: ImportSummary;
  availableCategories: string[];
} {
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("The uploaded Excel workbook contains no sheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse rows as raw JS objects
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: true,
  });

  const defaultCat = options.defaultCategory?.trim() || "Electronic Components";
  const existingProducts = options.existingProducts || [];

  // Map of normalized name to existing product
  const existingMap = new Map<string, ExistingProductReference>();
  for (const ep of existingProducts) {
    existingMap.set(normalizeProductName(ep.name), ep);
  }

  const seenInFile = new Set<string>();
  const parsedRows: ParsedProductRow[] = [];
  const categoryCounts: Record<string, number> = {};

  let readyCount = 0;
  let duplicateCount = 0;
  let warningCount = 0;
  let invalidCount = 0;

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Accounting for 1-based index + header row

    // Extract product name
    const rawNameVal = findColumnValue(row, NAME_ALIASES);
    const rawName = rawNameVal ? String(rawNameVal).trim() : "";

    // Extract cost price
    const rawCostVal = findColumnValue(row, COST_PRICE_ALIASES);
    const rawCost = rawCostVal !== undefined ? rawCostVal : "";

    // Extract category
    const rawCatVal = findColumnValue(row, CATEGORY_ALIASES);
    const category = rawCatVal ? String(rawCatVal).trim() : defaultCat;

    // Extract description / additional information (e.g. Column 4)
    const rawDescVal = findColumnValue(row, DESCRIPTION_ALIASES);
    const extraInfo = rawDescVal ? String(rawDescVal).trim() : "";
    let description = "";

    if (extraInfo) {
      // If extra info is present, format it clearly with the product name
      description = `${rawName} (${extraInfo}). High-quality component designed for STEM education, school lab experiments, and hands-on maker learning.`;
    } else if (rawName) {
      description = `High-quality ${rawName} designed for STEM education, school lab experiments, and hands-on maker learning.`;
    }

    // Extract stock
    const rawStockVal = findColumnValue(row, STOCK_ALIASES);
    const parsedStock = rawStockVal !== undefined && !isNaN(Number(rawStockVal)) ? Number(rawStockVal) : 100;

    // Extract image
    const rawImgVal = findColumnValue(row, IMAGE_ALIASES);
    const imageInput = rawImgVal ? String(rawImgVal).trim() : rawName;

    // Extract badge
    const rawBadgeVal = findColumnValue(row, BADGE_ALIASES);
    const badge = rawBadgeVal ? String(rawBadgeVal).trim() : null;

    // Compute prices
    const pricing = calculatePrices(rawCost as number | string);

    // Compute images
    let images: string[] = [];
    let imageMapped = false;
    let imageWarning: string | undefined;

    if (imageInput) {
      const generatedPath = buildProductImagePath(category, imageInput);
      images = [generatedPath];
      imageMapped = true;
    } else {
      imageWarning = "No image mapped — placeholder will be used.";
    }

    // Determine status & warnings
    let status: "ready" | "duplicate" | "warning" | "invalid" = "ready";
    let statusReason: string | undefined;
    let existingProductId: string | undefined;

    if (!rawName) {
      status = "invalid";
      statusReason = "Missing product name";
      invalidCount++;
    } else if (pricing.costPrice <= 0 || pricing.sellingPrice <= 0) {
      status = "invalid";
      statusReason = "Invalid or zero cost price";
      invalidCount++;
    } else {
      const normalizedName = normalizeProductName(rawName);

      if (seenInFile.has(normalizedName)) {
        status = "duplicate";
        statusReason = "Duplicate item within this uploaded file";
        duplicateCount++;
      } else if (existingMap.has(normalizedName)) {
        const existing = existingMap.get(normalizedName)!;
        status = "duplicate";
        statusReason = `Already exists in database (${existing.name})`;
        existingProductId = existing.id;
        duplicateCount++;
      } else if (!imageMapped) {
        status = "warning";
        statusReason = "Missing image mapping";
        warningCount++;
      } else {
        status = "ready";
        readyCount++;
      }

      seenInFile.add(normalizedName);
    }

    // Count categories
    const catKey = category || "Uncategorized";
    categoryCounts[catKey] = (categoryCounts[catKey] || 0) + 1;

    parsedRows.push({
      rowNumber,
      rawName,
      name: rawName,
      category,
      description,
      rawCostPrice: rawCost as number | string,
      pricing,
      images,
      stock: parsedStock,
      badge,
      imageMapped,
      imageWarning,
      status,
      statusReason,
      existingProductId,
    });
  });

  return {
    rows: parsedRows,
    summary: {
      total: parsedRows.length,
      ready: readyCount,
      duplicates: duplicateCount,
      warnings: warningCount,
      invalid: invalidCount,
      categoryCounts,
    },
    availableCategories: Object.keys(categoryCounts),
  };
}

/**
 * Export product list to XLSX / CSV
 */
export function exportProductsToSpreadsheet(
  products: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    price: number;
    originalPrice?: number | null;
    stock: number;
    isActive: boolean;
    images: string[];
    badge?: string | null;
    createdAt: string;
  }>,
  format: "xlsx" | "csv" = "xlsx"
): {
  data: Uint8Array | string;
  filename: string;
  mimeType: string;
} {
  const exportData = products.map((p, index) => ({
    "S.No": index + 1,
    "Product ID": p.id,
    "Product Name": p.name,
    Category: p.category,
    "Selling Price (INR)": p.price,
    "Original Price (INR)": p.originalPrice || "",
    Stock: p.stock,
    Status: p.isActive ? "Active" : "Inactive",
    Badge: p.badge || "",
    "Image URL": p.images?.join("; ") || "",
    Description: p.description,
    "Created Date": p.createdAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "STEMSaathi Products");

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `STEMSaathi_Products_Backup_${timestamp}.${format}`;

  if (format === "csv") {
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    return {
      data: csvOutput,
      filename,
      mimeType: "text/csv;charset=utf-8;",
    };
  }

  const binaryOutput = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return {
    data: new Uint8Array(binaryOutput),
    filename,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
