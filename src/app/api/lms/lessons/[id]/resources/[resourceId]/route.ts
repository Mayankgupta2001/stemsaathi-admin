import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { lessonId: string; resourceId: string } }
) {
  try {
    // Verify admin token
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized. Admin token required." }, { status: 401 });
    }

    const { lessonId, resourceId } = params;

    if (!lessonId || !resourceId) {
      return NextResponse.json({ error: "Lesson ID and Resource ID are required." }, { status: 400 });
    }

    // Verify resource exists and belongs to the lesson
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource || resource.lessonId !== lessonId) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    // Delete resource
    await prisma.resource.delete({
      where: { id: resourceId },
    });

    return NextResponse.json({
      success: true,
      message: "Resource deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json({ error: "Failed to delete resource." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    // Verify admin token
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized. Admin token required." }, { status: 401 });
    }

    const { id: lessonId, resourceId } = await params;
    const body = await req.json();
    const title = body?.title ? String(body.title).trim() : undefined;
    const fileUrl = body?.fileUrl ? String(body.fileUrl).trim() : undefined;
    const type = body?.type ? String(body.type).toLowerCase() : undefined;

    if (!lessonId || !resourceId) {
      return NextResponse.json({ error: "Lesson ID and Resource ID are required." }, { status: 400 });
    }

    // Verify resource exists and belongs to the lesson
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource || resource.lessonId !== lessonId) {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    // Update resource
    const updatedResource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...(title && { title }),
        ...(fileUrl && { fileUrl }),
        ...(type && { type }),
      },
    });

    return NextResponse.json({
      success: true,
      resource: updatedResource,
    });
  } catch (error) {
    console.error("Error updating resource:", error);
    return NextResponse.json({ error: "Failed to update resource." }, { status: 500 });
  }
}
