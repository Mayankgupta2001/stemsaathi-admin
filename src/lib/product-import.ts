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

// -----------------------------------------------------------------------------
// NAME NORMALIZATION
// -----------------------------------------------------------------------------

export function normalizeProductName(name: string): string {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeFileName(name: string): string {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(jpg|jpeg|png|webp)$/i, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

// -----------------------------------------------------------------------------
// EXCEL COLUMN ALIASES
// -----------------------------------------------------------------------------

const NAME_ALIASES = [
  "product name", "product", "item name", "item", "name", "title",
  "component", "product_name", "item_name", "components",
  "electronic component", "product title",
  "p1 package: electronic development, robotics, internet of things and sensors & stem kits",
];

const COST_PRICE_ALIASES = [
  "cost price", "cost", "price", "rate", "unit price", "buying price",
  "purchase price", "cost_price", "unit cost", "amount", "cost(inr)",
  "cost (inr)", "price (inr)", "rate (inr)",
];

const CATEGORY_ALIASES = [
  "category", "package", "type", "cat", "group", "product category",
  "category name", "section",
];

const DESCRIPTION_ALIASES = [
  "description", "desc", "details", "specification", "specifications",
  "specs", "info", "additional information", "extra information",
  "additional info", "accessories", "included", "remarks", "features", "notes",
];

const STOCK_ALIASES = [
  "stock", "quantity", "qty", "stock quantity", "units", "inventory",
  "available", "stock count",
];

const IMAGE_ALIASES = [
  "image", "image url", "image_url", "image name", "image filename",
  "filename", "img", "photo", "images", "picture",
];

const BADGE_ALIASES = ["badge", "tag", "highlight", "label", "badge text"];

function findColumnValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const keys = Object.keys(row);

  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchedKey = keys.find(
      (key) => key.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedAlias
    );

    if (
      matchedKey &&
      row[matchedKey] !== undefined &&
      row[matchedKey] !== null &&
      String(row[matchedKey]).trim() !== ""
    ) {
      return row[matchedKey];
    }
  }

  return undefined;
}

function strictUrlEncode(str: string): string {
  return encodeURIComponent(str).replace(/\(/g, "%28").replace(/\)/g, "%29");
}

// -----------------------------------------------------------------------------
// IMAGE FOLDER RESOLUTION
// -----------------------------------------------------------------------------
// Right now ALL product photos physically live inside ONE folder on the
// frontend: public/images/Electronic Components — regardless of which
// category the product belongs to in the shop (Sensors, Drones & Parts,
// STEM Kits, etc). So we must NOT use the product's "category" field to
// build the folder path — that was the root bug causing broken images.
//
// When you eventually create dedicated image folders for other categories
// (e.g. public/images/Sensors, public/images/STEM Kits), just add an entry
// below. Anything not listed here falls back to "Electronic Components".
// -----------------------------------------------------------------------------

const DEFAULT_IMAGE_FOLDER = "Electronic Components";

const CATEGORY_IMAGE_FOLDER_MAP: Record<string, string> = {
  // "Sensors": "Sensors",              // <-- uncomment once that folder exists
  // "STEM Kits": "STEM Kits",          // <-- uncomment once that folder exists
};

function resolveImageFolder(category: string): string {
  return CATEGORY_IMAGE_FOLDER_MAP[category] || DEFAULT_IMAGE_FOLDER;
}

// -----------------------------------------------------------------------------
// IMAGE PATH BUILDER
// -----------------------------------------------------------------------------

export function buildProductImagePath(folder: string, filenameOrName: string): string {
  if (!filenameOrName || !filenameOrName.trim()) {
    return "";
  }

  const trimmed = filenameOrName.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return encodeURI(trimmed);
  }

  const cleanFilename = /\.(jpg|jpeg|png|webp)$/i.test(trimmed) ? trimmed : `${trimmed}.jpg`;
  const encodedFolder = strictUrlEncode(folder || DEFAULT_IMAGE_FOLDER);
  const encodedFilename = strictUrlEncode(cleanFilename);

  return `/images/${encodedFolder}/${encodedFilename}`;
}

// -----------------------------------------------------------------------------
// REAL FILES ON DISK (public/images/Electronic Components)
// Source of truth: `dir` output from the frontend repo, 19 Aug 2026.
// Update this list whenever new images are added.
// -----------------------------------------------------------------------------

const ACTUAL_IMAGE_FILES: string[] = [
  "10000 Mh 5 volt Power Bank.jpg",
  "150 RPM BO Motor.jpg",
  "16x2 LCD display.jpg",
  "4 wheel Robotics DIY Kit.jpg",
  "555 timer ic.jpg",
  "7 Segment Led Display (4 digit).jpg",
  "8-8 LED Matrix Module.jpg",
  "9v Battery chargers.jpg",
  "Active Buzzer (Big).jpg",
  "Active Buzzer (Small).jpg",
  "Aerospace Kit.jpg",
  "Agritech Kit.jpg",
  "Alligator Connectors (12 inches).jpg",
  "Arduino Mega.webp",
  "Arduino Nano, Cable.jpg",
  "Arduino Uno, Cable.webp",
  "Atmega16A PU.jpg",
  "Automobile Kit.jpg",
  "Battery clips with DC Jack.jpg",
  "Big sound Microphone module.jpg",
  "Bio-medical Kit.jpg",
  "Bio-tech Kit.jpg",
  "Bluetooth.jpg",
  "BO Motor.jpg",
  "BO Wheel.jpg",
  "Button Switch.jpg",
  "Capacitative Touch Switch.jpg",
  "Capacitor Box.jpg",
  "Color Recognition Sensor.jpg",
  "Continuous Metal Gear Servo 360.jpg",
  "DC motor 12V 150 rpm.jpg",
  "Diode (3 Types 25 each) & Transistor kit (3 Types 10 each).jpg",
  "Drone Kit.jpg",
  "Female Berg Strip 40 pins.jpg",
  "Flex Sensor.jpg",
  "Force Pressure Sensor.jpg",
  "General Purpose Board (Big).jpg",
  "General Purpose Board (Small).jpg",
  "GPS Neo 6M.jpg",
  "GSM 900.jpg",
  "Hookup Wires (Black Wire100 Mtr).jpg",
  "Hookup Wires (Red Wire 100 Mtr).jpg",
  "Humidity Sensor.jpg",
  "IR (transmitter) receiver -TSOP 1738.jpg",
  "IR Sensors Arrary for Line Follwing.jpg",
  "IR Sensors, Obstacle avoider sensor.jpg",
  "Joy Stick.jpg",
  "Jumper Cable_Female-Female.jpg",
  "Jumper Cable_Male-Female.jpg",
  "Jumper Cable_Male-Male.jpg",
  "Keypad.jpg",
  "L298P Motor Driver.jpg",
  "Laser Diode.jpg",
  "LDR Module.jpg",
  "LEDs (Blue).jpg",
  "LEDs (Green).jpg",
  "LEDs (Red).jpg",
  "LEDs (white).jpg",
  "LEDs (yellow).jpg",
  "Linear Voltage Regulator - 7805.webp",
  "Linear Voltage Regulator - 7809.webp",
  "Linear Voltage Regulator - 7812.jpg",
  "Male Berg Strip 40 pins.jpg",
  "Mechanical Construction kit.jpg",
  "Metal touch sensor module.jpg",
  "Motor driver (L293D).jpg",
  "MPR121- Capacitative touch module.jpg",
  "MQ-135.jpg",
  "MQ-2.jpg",
  "MQ-3.jpg",
  "MQ-4.jpg",
  "MQ-5.jpg",
  "MQ-6.jpg",
  "MQ-7.jpg",
  "MQ-8.jpg",
  "Node MCU_Wemos D1.jpg",
  "Other potential STEM application Kit.jpg",
  "Piezoelectric Plate.jpg",
  "PIR Motion Detector Module.jpg",
  "Position Servo Angle based Metal Gear.jpg",
  "Pulse Rate Heart Sensor.jpg",
  "Rain Drop Sensor.jpg",
  "Rasberry pi 3 model B+.webp",
  "Relay Module 1-channel.jpg",
  "Relay Module 2-channel.jpg",
  "Resistor Box.jpg",
  "RF Modules Tx & Rx 315 MHz ASK.jpg",
  "RFID Reader – Tags.jpg",
  "RGB LEDs.jpg",
  "Self Adhesive Proto Shield.jpg",
  "Servo Motor Testor.jpg",
  "Small Servo Metal Gear MG 90.jpg",
  "Small Servo Plastic Gear.jpg",
  "Soil Moisture Sensor.jpg",
  "Solderless 400 Pin.webp",
  "Solderless 800 Pin.jpg",
  "Sound Playback Module.jpg",
  "Sound Sensor.jpg",
  "Stepper motor with Driver board.jpg",
  "Temperature & Humidty Sensor (DHT11 Sensor).jpg",
  "Temperature Sensor.jpg",
  "Touch Sensor Capacitive Touch Module.jpg",
  "Triple Axis accelerometer.jpg",
  "Triple Axis Magnetometer.jpg",
  "Ultrasonic Sensor.jpg",
  "USB Cables A to B (12 inches).jpg",
  "Vibrating Motor.jpg",
  "Water Flow Sensor.jpg",
  "Water Pump module.jpg",
  "Water-Sanitation Kit.jpg",
  "Wemos D1_R2.jpg",
];

// -----------------------------------------------------------------------------
// KNOWN IMAGE MAPPINGS
// Confirmed pairs where the product's Excel/DB name differs from the actual
// filename on disk. Add more here whenever you spot a wrong/missing image.
// -----------------------------------------------------------------------------

const KNOWN_IMAGE_MAPPINGS: Record<string, string> = {
  [normalizeProductName("Arduino Uno R3 DIP Microcontroller")]: "Arduino Uno, Cable.webp",
  [normalizeProductName("Arduino Uno, Cable")]: "Arduino Uno, Cable.webp",
  [normalizeProductName("Arduino Nano, Cable")]: "Arduino Nano, Cable.jpg",
  [normalizeProductName("Arduino Mega")]: "Arduino Mega.webp",

  [normalizeProductName("830 Points Solderless Breadboard")]: "Solderless 800 Pin.jpg",
  [normalizeProductName("Solderless 800 Pin")]: "Solderless 800 Pin.jpg",
  [normalizeProductName("Solderless 400 Pin")]: "Solderless 400 Pin.webp",

  [normalizeProductName("16x2 I2C Character LCD Module Blue Backlight")]: "16x2 LCD display.jpg",
  [normalizeProductName("16x2 LCD display")]: "16x2 LCD display.jpg",

  [normalizeProductName("HC-SR04 Ultrasonic Distance Sensor")]: "Ultrasonic Sensor.jpg",
  [normalizeProductName("Ultrasonic Sensor")]: "Ultrasonic Sensor.jpg",

  [normalizeProductName("SG90 Micro Servo Motor 9g")]: "Small Servo Metal Gear MG 90.jpg",
  [normalizeProductName("Small Servo Metal Gear MG 90")]: "Small Servo Metal Gear MG 90.jpg",
};

// -----------------------------------------------------------------------------
// IMAGE MATCHING
// -----------------------------------------------------------------------------

function getKnownImageFilename(productName: string): string | null {
  return KNOWN_IMAGE_MAPPINGS[normalizeProductName(productName)] || null;
}

function getFallbackImageFilename(productName: string): string | null {
  const normalizedProduct = normalizeFileName(productName);
  if (!normalizedProduct) return null;

  // 1. Exact normalized filename match
  const exactMatch = ACTUAL_IMAGE_FILES.find(
    (file) => normalizeFileName(file) === normalizedProduct
  );
  if (exactMatch) return exactMatch;

  // 2. One contains the other
  const containsMatch = ACTUAL_IMAGE_FILES.find((file) => {
    const normalizedFile = normalizeFileName(file);
    return normalizedFile.includes(normalizedProduct) || normalizedProduct.includes(normalizedFile);
  });
  if (containsMatch) return containsMatch;

  // 3. Token overlap scoring (needs at least 2 shared meaningful tokens)
  const productTokens = normalizedProduct.match(/[a-z0-9]+/g)?.filter((t) => t.length >= 3) || [];
  if (productTokens.length === 0) return null;

  let bestFile: string | null = null;
  let bestScore = 0;

  for (const file of ACTUAL_IMAGE_FILES) {
    const normalizedFile = normalizeFileName(file);
    let score = 0;
    for (const token of productTokens) {
      if (normalizedFile.includes(token)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestFile = file;
    }
  }

  if (bestFile && bestScore >= Math.min(2, productTokens.length)) {
    return bestFile;
  }

  return null;
}

function resolveProductImage(
  category: string,
  productName: string,
  imageInput?: string
): { path: string; mapped: boolean; warning?: string } {
  const folder = resolveImageFolder(category);

  // 1. Explicit image value from Excel wins (if it's a real URL or filename with extension)
  if (imageInput && imageInput.trim()) {
    const trimmed = imageInput.trim();

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
      return { path: trimmed, mapped: true };
    }

    if (/\.(jpg|jpeg|png|webp)$/i.test(trimmed)) {
      // Verify the file actually exists before trusting it blindly
      const existsOnDisk = ACTUAL_IMAGE_FILES.some(
        (f) => normalizeFileName(f) === normalizeFileName(trimmed)
      );
      if (existsOnDisk) {
        return { path: buildProductImagePath(folder, trimmed), mapped: true };
      }
      // fall through to name-based matching below if the given filename doesn't exist
    }
  }

  // 2. Known confirmed mapping
  const knownFilename = getKnownImageFilename(productName);
  if (knownFilename) {
    return { path: buildProductImagePath(folder, knownFilename), mapped: true };
  }

  // 3. Fuzzy match against real files on disk
  const fallbackFilename = getFallbackImageFilename(productName);
  if (fallbackFilename) {
    return { path: buildProductImagePath(folder, fallbackFilename), mapped: true };
  }

  return {
    path: "",
    mapped: false,
    warning: `No matching image found for "${productName}". Upload a file and add it to ACTUAL_IMAGE_FILES / KNOWN_IMAGE_MAPPINGS.`,
  };
}

// -----------------------------------------------------------------------------
// PARSE SPREADSHEET
// -----------------------------------------------------------------------------

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
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: true,
  });

  const defaultCat = options.defaultCategory?.trim() || "Electronic Components";
  const existingProducts = options.existingProducts || [];

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
    const rowNumber = index + 2;

    const rawNameVal = findColumnValue(row, NAME_ALIASES);
    const rawName = rawNameVal ? String(rawNameVal).trim() : "";

    const rawCostVal = findColumnValue(row, COST_PRICE_ALIASES);
    const rawCost = rawCostVal !== undefined ? rawCostVal : "";

    const rawCatVal = findColumnValue(row, CATEGORY_ALIASES);
    const category = rawCatVal ? String(rawCatVal).trim() : defaultCat;

    const rawDescVal = findColumnValue(row, DESCRIPTION_ALIASES);
    const extraInfo = rawDescVal ? String(rawDescVal).trim() : "";

    let description = "";
    if (extraInfo) {
      description = `${rawName} (${extraInfo}). High-quality component designed for STEM education, school lab experiments, and hands-on maker learning.`;
    } else if (rawName) {
      description = `High-quality ${rawName} designed for STEM education, school lab experiments, and hands-on maker learning.`;
    }

    const rawStockVal = findColumnValue(row, STOCK_ALIASES);
    const parsedStock = rawStockVal !== undefined && !isNaN(Number(rawStockVal)) ? Number(rawStockVal) : 100;

    const rawImgVal = findColumnValue(row, IMAGE_ALIASES);
    const imageInput = rawImgVal ? String(rawImgVal).trim() : "";

    const rawBadgeVal = findColumnValue(row, BADGE_ALIASES);
    const badge = rawBadgeVal ? String(rawBadgeVal).trim() : null;

    const pricing = calculatePrices(rawCost as number | string);

    const imageResult = resolveProductImage(category, rawName, imageInput);
    const images = imageResult.mapped ? [imageResult.path] : [];
    const imageMapped = imageResult.mapped;
    const imageWarning = imageResult.warning;

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
        statusReason = imageWarning || "Missing image mapping";
        warningCount++;
      } else {
        status = "ready";
        readyCount++;
      }

      seenInFile.add(normalizedName);
    }

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

// -----------------------------------------------------------------------------
// EXPORT PRODUCTS
// -----------------------------------------------------------------------------

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
    return { data: csvOutput, filename, mimeType: "text/csv;charset=utf-8;" };
  }

  const binaryOutput = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  return {
    data: new Uint8Array(binaryOutput),
    filename,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}