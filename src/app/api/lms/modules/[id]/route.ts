import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const courseModule = await prisma.module.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { order: "asc" } },
        course: true,
      },
    });

    if (!courseModule) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, module: courseModule });
  } catch (error) {
    console.error("Error fetching module:", error);
    return NextResponse.json({ error: "Failed to fetch module." }, { status: 500 });
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
    if (body.courseId !== undefined) updateData.courseId = String(body.courseId).trim();
    if (body.order !== undefined) {
      const parsedOrder = Number(body.order);
      if (!Number.isFinite(parsedOrder)) {
        return NextResponse.json({ error: "Order must be a valid number." }, { status: 400 });
      }
      updateData.order = Math.max(0, Math.floor(parsedOrder));
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "At least one field is required to update." }, { status: 400 });
    }

    const updateResult = await prisma.module.updateMany({
      where: { id },
      data: updateData,
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    const courseModule = await prisma.module.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { order: "asc" } },
        course: true,
      },
    });

    return NextResponse.json({ success: true, module: courseModule });
  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json({ error: "Failed to update module." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!verifyAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleteResult = await prisma.module.deleteMany({ where: { id } });
    if (deleteResult.count === 0) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json({ error: "Failed to delete module." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: Params) {
  return PATCH(req, context);
}
