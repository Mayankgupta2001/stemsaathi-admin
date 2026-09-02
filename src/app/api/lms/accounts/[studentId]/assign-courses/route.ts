import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    // Verify admin token
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized. Admin token required." }, { status: 401 });
    }

    const { studentId } = await params;
    const body = await req.json();
    const courseIds = Array.isArray(body?.courseIds) ? body.courseIds : [];

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json({ error: "courseIds array is required and must not be empty." }, { status: 400 });
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    // Verify all courses exist
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
    });

    if (courses.length !== courseIds.length) {
      return NextResponse.json({ error: "One or more courses not found." }, { status: 404 });
    }

    // Create or update enrollments
    const enrollments = await Promise.all(
      courseIds.map((courseId) =>
        prisma.enrollment.upsert({
          where: {
            studentId_courseId: { studentId, courseId },
          },
          update: { status: "active" },
          create: { studentId, courseId, status: "active" },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Assigned ${enrollments.length} course(s) to student.`,
      enrollments,
    });
  } catch (error) {
    console.error("Error assigning courses:", error);
    return NextResponse.json({ error: "Failed to assign courses." }, { status: 500 });
  }
}

export async function GET(
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

    // Get student with enrollments
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        accountType: student.accountType,
        organizationName: student.organizationName,
        organizationType: student.organizationType,
        enrollments: student.enrollments,
      },
    });
  } catch (error) {
    console.error("Error fetching student enrollments:", error);
    return NextResponse.json({ error: "Failed to fetch student." }, { status: 500 });
  }
}
