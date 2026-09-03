import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    // Verify admin token
    if (!verifyAdminToken(req)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin token required." },
        { status: 401 }
      );
    }

    const { studentId } = await params;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    // Get student with full details
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                modules: true,
              },
            },
          },
        },
        progress: {
          include: {
            lesson: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      account: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        accountType: student.accountType,
        organizationName: student.organizationName,
        organizationType: student.organizationType,
        isVerified: student.isVerified,
        coursesAssigned: student.enrollments.length,
        enrollments: student.enrollments,
        progress: student.progress,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    return NextResponse.json({ error: "Failed to fetch account." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    // Verify admin token
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized. Admin token required." }, { status: 401 });
    }

    const { studentId } = await params;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    // Delete student (will cascade delete enrollments, progress, payments)
    const student = await prisma.student.delete({
      where: { id: studentId },
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully.",
      deletedAccount: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
