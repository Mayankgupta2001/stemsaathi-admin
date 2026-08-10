import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

function verifyToken(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, products }, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      description,
      category,
      price,
      originalPrice,
      images,
      stock,
      badge,
    } = body;

    if (!name || !description || !category || price === undefined || price === null) {
      return NextResponse.json(
        { error: "Name, description, category, and price are required." },
        { status: 400 }
      );
    }

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Price must be a valid non-negative number." },
        { status: 400 }
      );
    }

    const parsedOriginalPrice = originalPrice === undefined || originalPrice === null || originalPrice === ""
      ? null
      : Number(originalPrice);

    if (parsedOriginalPrice !== null && (Number.isNaN(parsedOriginalPrice) || parsedOriginalPrice < 0)) {
      return NextResponse.json(
        { error: "Original price must be a valid non-negative number." },
        { status: 400 }
      );
    }

    const parsedStock = stock === undefined || stock === null ? 100 : Number(stock);
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      return NextResponse.json(
        { error: "Stock must be a valid non-negative number." },
        { status: 400 }
      );
    }

    const normalizedImages = Array.isArray(images)
      ? images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
      : [];

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        description: String(description).trim(),
        category: String(category).trim(),
        price: parsedPrice,
        originalPrice: parsedOriginalPrice,
        images: normalizedImages,
        badge: badge ? String(badge).trim() : null,
        stock: parsedStock,
        rating: 4.5,
        reviewCount: 0,
      },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      updateData.name = String(updates.name).trim();
    }
    if (updates.description !== undefined) {
      updateData.description = String(updates.description).trim();
    }
    if (updates.category !== undefined) {
      updateData.category = String(updates.category).trim();
    }
    if (updates.price !== undefined) {
      const parsedPrice = Number(updates.price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { error: "Price must be a valid non-negative number." },
          { status: 400 }
        );
      }
      updateData.price = parsedPrice;
    }
    if (updates.originalPrice !== undefined) {
      const parsedOriginalPrice = updates.originalPrice === "" || updates.originalPrice === null
        ? null
        : Number(updates.originalPrice);
      if (parsedOriginalPrice !== null && (Number.isNaN(parsedOriginalPrice) || parsedOriginalPrice < 0)) {
        return NextResponse.json(
          { error: "Original price must be a valid non-negative number." },
          { status: 400 }
        );
      }
      updateData.originalPrice = parsedOriginalPrice;
    }
    if (updates.images !== undefined) {
      updateData.images = Array.isArray(updates.images)
        ? updates.images.filter((image: unknown): image is string => typeof image === "string" && image.trim().length > 0)
        : [];
    }
    if (updates.stock !== undefined) {
      const parsedStock = Number(updates.stock);
      if (Number.isNaN(parsedStock) || parsedStock < 0) {
        return NextResponse.json(
          { error: "Stock must be a valid non-negative number." },
          { status: 400 }
        );
      }
      updateData.stock = parsedStock;
    }
    if (updates.badge !== undefined) {
      updateData.badge = updates.badge ? String(updates.badge).trim() : null;
    }
    if (updates.isActive !== undefined) {
      updateData.isActive = Boolean(updates.isActive);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field is required to update." },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, product }, { status: 200 });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? "";

    const body = req.method === "DELETE" ? await req.json().catch(() => ({})) : {};
    const deleteId = id || body.id || "";

    if (!deleteId) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id: deleteId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product." },
      { status: 500 }
    );
  }
}
