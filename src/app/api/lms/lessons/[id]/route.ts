import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return NextResponse.json({ error: "Failed to fetch lesson." }, { status: 500 });
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
    if (body.moduleId !== undefined) updateData.moduleId = String(body.moduleId).trim();
    if (body.order !== undefined) {
      const parsedOrder = Number(body.order);
      if (!Number.isFinite(parsedOrder)) {
        return NextResponse.json({ error: "Order must be a valid number." }, { status: 400 });
      }
      updateData.order = Math.max(0, Math.floor(parsedOrder));
    }
    if (body.content !== undefined) updateData.content = body.content ? String(body.content).trim() : null;
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl ? String(body.videoUrl).trim() : null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "At least one field is required to update." }, { status: 400 });
    }

    const updateResult = await prisma.lesson.updateMany({
      where: { id },
      data: updateData,
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });

    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    console.error("Error updating lesson:", error);
    return NextResponse.json({ error: "Failed to update lesson." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!verifyAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleteResult = await prisma.lesson.deleteMany({ where: { id } });
    if (deleteResult.count === 0) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json({ error: "Failed to delete lesson." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: Params) {
  return PATCH(req, context);
}
