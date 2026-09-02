import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    const modules = await prisma.module.findMany({
      where: courseId ? { courseId } : undefined,
      orderBy: [{ courseId: "asc" }, { order: "asc" }],
      include: {
        lessons: { orderBy: { order: "asc" } },
        course: true,
      },
    });

    return NextResponse.json({ success: true, modules });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json({ error: "Failed to fetch modules." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const courseId = String(body?.courseId || "").trim();
    const order = Number(body?.order ?? 0);

    if (!title || !courseId) {
      return NextResponse.json({ error: "Title and courseId are required." }, { status: 400 });
    }

    if (!Number.isFinite(order)) {
      return NextResponse.json({ error: "Order must be a valid number." }, { status: 400 });
    }

    const courseModule = await prisma.module.create({
      data: { title, courseId, order: Math.max(0, Math.floor(order)) },
      include: { lessons: true, course: true },
    });

    return NextResponse.json({ success: true, module: courseModule }, { status: 201 });
  } catch (error) {
    console.error("Error creating module:", error);
    return NextResponse.json({ error: "Failed to create module." }, { status: 500 });
  }
}
