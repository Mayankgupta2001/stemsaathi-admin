import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "stemsaathi-default-admin-jwt-secret-key-2025";

function verifyToken(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

interface ImportProductInput {
  name: string;
  description?: string;
  category: string;
  price: number | string;
  originalPrice?: number | string | null;
  images?: string[];
  stock?: number | string;
  badge?: string | null;
}

export async function POST(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { products, duplicateMode = "skip" } = body as {
      products: ImportProductInput[];
      duplicateMode?: "skip" | "update" | "insert";
    };

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "A non-empty array of products is required for import." },
        { status: 400 }
      );
    }

    // Retrieve existing products for duplicate verification
    const existingProducts = await prisma.product.findMany();
    const existingMap = new Map<string, { id: string; name: string; category: string }>();

    for (const ep of existingProducts) {
      const key = ep.name.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      existingMap.set(key, { id: ep.id, name: ep.name, category: ep.category });
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ product: string; reason: string }> = [];

    // Process each item with isolation to safely report errors and avoid halting on a single malformed row
    for (const item of products) {
      const rawName = String(item.name || "").trim();
      if (!rawName) {
        errors.push({ product: "Unknown (Empty name)", reason: "Product name is required." });
        continue;
      }

      const parsedPrice = Math.round(Number(item.price));
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        errors.push({ product: rawName, reason: `Invalid selling price: ${item.price}` });
        continue;
      }

      const category = String(item.category || "Electronic Components").trim();
      const description = String(item.description || `High-quality ${rawName} designed for STEM education and practical learning.`).trim();

      const parsedOriginalPrice = item.originalPrice !== undefined && item.originalPrice !== null && item.originalPrice !== ""
        ? Math.round(Number(item.originalPrice))
        : null;

      const parsedStock = item.stock !== undefined && item.stock !== null && !isNaN(Number(item.stock))
        ? Number(item.stock)
        : 100;

      const normalizedImages = Array.isArray(item.images)
        ? item.images.filter((img): img is string => typeof img === "string" && img.trim().length > 0)
        : [];

      const badge = item.badge ? String(item.badge).trim() : null;

      const normalizedKey = rawName.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      const existingProduct = existingMap.get(normalizedKey);

      if (existingProduct) {
        if (duplicateMode === "skip") {
          skippedCount++;
          continue;
        } else if (duplicateMode === "update") {
          try {
            await prisma.product.update({
              where: { id: existingProduct.id },
              data: {
                name: rawName,
                category,
                description,
                price: parsedPrice,
                originalPrice: parsedOriginalPrice,
                images: normalizedImages.length > 0 ? normalizedImages : undefined,
                stock: parsedStock,
                badge,
              },
            });
            updatedCount++;
          } catch (updateErr) {
            errors.push({
              product: rawName,
              reason: `Failed to update existing product: ${(updateErr as Error).message}`,
            });
          }
          continue;
        }
      }

      // Insert new product
      try {
        await prisma.product.create({
          data: {
            name: rawName,
            category,
            description,
            price: parsedPrice,
            originalPrice: parsedOriginalPrice,
            images: normalizedImages,
            stock: parsedStock,
            badge,
            rating: 4.5,
            reviewCount: 0,
            isActive: true,
          },
        });
        importedCount++;
        existingMap.set(normalizedKey, { id: "new", name: rawName, category });
      } catch (insertErr) {
        errors.push({
          product: rawName,
          reason: `Database insertion error: ${(insertErr as Error).message}`,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: errors.length,
        errors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error importing products:", error);
    return NextResponse.json(
      { error: "Failed to process product import." },
      { status: 500 }
    );
  }
}
