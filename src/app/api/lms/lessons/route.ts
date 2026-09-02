import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");

    const lessons = await prisma.lesson.findMany({
      where: moduleId ? { moduleId } : undefined,
      orderBy: [{ moduleId: "asc" }, { order: "asc" }],
      include: { module: { include: { course: true } } },
    });

    return NextResponse.json({ success: true, lessons });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json({ error: "Failed to fetch lessons." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const moduleId = String(body?.moduleId || "").trim();
    const order = Number(body?.order ?? 0);
    const content = body?.content !== undefined ? String(body.content) : null;
    const videoUrl = body?.videoUrl ? String(body.videoUrl).trim() : null;

    if (!title || !moduleId) {
      return NextResponse.json({ error: "Title and moduleId are required." }, { status: 400 });
    }

    if (!Number.isFinite(order)) {
      return NextResponse.json({ error: "Order must be a valid number." }, { status: 400 });
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        moduleId,
        order: Math.max(0, Math.floor(order)),
        content: content && content.trim().length > 0 ? content.trim() : null,
        videoUrl,
      },
      include: { module: { include: { course: true } } },
    });

    return NextResponse.json({ success: true, lesson }, { status: 201 });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json({ error: "Failed to create lesson." }, { status: 500 });
  }
}
