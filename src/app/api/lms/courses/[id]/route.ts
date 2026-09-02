import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

const collapseRepeatedText = (value: string) => {
  const text = value.trim();
  if (!text) return "";

  for (let size = 1; size <= Math.floor(text.length / 2); size++) {
    if (text.length % size !== 0) continue;
    const chunk = text.slice(0, size);
    if (chunk.repeat(text.length / size) === text) {
      return chunk;
    }
  }

  return text;
};

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json({ error: "Failed to fetch course." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!verifyAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.description !== undefined) updateData.description = collapseRepeatedText(String(body.description || ""));
    if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail ? String(body.thumbnail).trim() : null;
    if (body.price !== undefined) {
      const parsedPrice = Number(body.price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: "Price must be a valid non-negative number." }, { status: 400 });
      }
      updateData.price = Math.round(parsedPrice);
    }
    if (body.isPublished !== undefined) updateData.isPublished = Boolean(body.isPublished);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "At least one field is required to update." }, { status: 400 });
    }

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
      },
    });

    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json({ error: "Failed to update course." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!verifyAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json({ error: "Failed to delete course." }, { status: 500 });
  }
}
