import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const { lessonId } = params;

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required." }, { status: 400 });
    }

    // Verify lesson exists
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    // Get all resources for the lesson
    const resources = await prisma.resource.findMany({
      where: { lessonId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      resources,
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json({ error: "Failed to fetch resources." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    // Verify admin token
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized. Admin token required." }, { status: 401 });
    }

    const { lessonId } = params;
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const fileUrl = String(body?.fileUrl || "").trim();
    const type = String(body?.type || "pdf").toLowerCase();

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required." }, { status: 400 });
    }

    if (!title || !fileUrl) {
      return NextResponse.json({ error: "Title and fileUrl are required." }, { status: 400 });
    }

    // Verify lesson exists
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    // Create resource
    const resource = await prisma.resource.create({
      data: {
        title,
        fileUrl,
        type,
        lessonId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        resource,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating resource:", error);
    return NextResponse.json({ error: "Failed to create resource." }, { status: 500 });
  }
}
