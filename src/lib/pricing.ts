/**
 * STEMSaathi Pricing Engine
 *
 * Rules:
 * 1. The price in the Excel/CSV file is the COST PRICE.
 * 2. Customer Selling Price = Cost Price × 2
 * 3. Original Price (MRP strike-through) is sensibly higher than Selling Price:
 *    - Selling < ₹100: +35%, rounded to end in 9 (e.g. ₹50 -> ₹69)
 *    - Selling ₹100 - ₹500: +25%, rounded to end in 99/49 (e.g. ₹200 (cost ₹100) -> ₹249, ₹400 (cost ₹200) -> ₹499)
 *    - Selling ₹501 - ₹2000: +20%, rounded to end in 99 (e.g. ₹1000 (cost ₹500) -> ₹1199)
 *    - Selling > ₹2000: +18%, rounded to end in 99 (e.g. ₹5000 (cost ₹2500) -> ₹5999)
 *    - In all cases, Original Price > Selling Price.
 */

export interface PricingResult {
  costPrice: number;
  sellingPrice: number;
  originalPrice: number;
}

export function calculatePrices(rawCostPrice: number | string | undefined | null): PricingResult {
  if (rawCostPrice === undefined || rawCostPrice === null || rawCostPrice === "") {
    return {
      costPrice: 0,
      sellingPrice: 0,
      originalPrice: 0,
    };
  }

  let cost: number;
  if (typeof rawCostPrice === "number") {
    cost = rawCostPrice;
  } else {
    // Strip currency symbols, commas, whitespace
    const cleaned = String(rawCostPrice).replace(/[^0-9.]/g, "");
    cost = parseFloat(cleaned);
  }

  if (Number.isNaN(cost) || cost <= 0) {
    return {
      costPrice: 0,
      sellingPrice: 0,
      originalPrice: 0,
    };
  }

  // Selling Price = Cost Price × 2
  const sellingPrice = Math.round(cost * 2);

  // Original Price calculation
  let originalPrice: number;

  if (sellingPrice < 100) {
    // E.g. selling ₹40 -> ₹59, ₹80 -> ₹99
    originalPrice = Math.ceil((sellingPrice * 1.35) / 10) * 10 - 1;
  } else if (sellingPrice <= 500) {
    // E.g. cost ₹200 -> selling ₹400 -> original ₹499
    originalPrice = Math.ceil((sellingPrice * 1.25) / 50) * 50 - 1;
  } else if (sellingPrice <= 2000) {
    // E.g. cost ₹500 -> selling ₹1000 -> original ₹1199
    originalPrice = Math.ceil((sellingPrice * 1.2) / 100) * 100 - 1;
  } else {
    // E.g. cost ₹2500 -> selling ₹5000 -> original ₹5899
    originalPrice = Math.ceil((sellingPrice * 1.18) / 100) * 100 - 1;
  }

  // Ensure original price is always strictly greater than selling price
  if (originalPrice <= sellingPrice) {
    originalPrice = sellingPrice + (sellingPrice >= 100 ? 99 : 19);
  }

  return {
    costPrice: Math.round(cost * 100) / 100,
    sellingPrice,
    originalPrice,
  };
}
