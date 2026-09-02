import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized. Admin token required." }, { status: 401 });
    }

    // Get all students with enrollment statistics
    const students = await prisma.student.findMany({
      include: {
        enrollments: {
          select: {
            id: true,
            courseId: true,
            status: true,
          },
        },
        progress: {
          select: {
            id: true,
            isCompleted: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format response with statistics
    const accounts = students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      accountType: student.accountType,
      organizationName: student.organizationName,
      organizationType: student.organizationType,
      phone: student.phone,
      isVerified: student.isVerified,
      coursesAssigned: student.enrollments.length,
      lessonsCompleted: student.progress.filter((p) => p.isCompleted).length,
      totalLessonsAssigned: student.progress.length,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      accounts,
      total: accounts.length,
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized. Admin token required." }, { status: 401 });
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();
    const accountType = String(body?.accountType || "INDIVIDUAL").toUpperCase();
    const organizationName = body?.organizationName ? String(body.organizationName).trim() : null;
    const organizationType = body?.organizationType ? String(body.organizationType).toUpperCase() : null;
    const phone = body?.phone ? String(body.phone).trim() : null;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!["SCHOOL", "INDIVIDUAL"].includes(accountType)) {
      return NextResponse.json(
        { error: "Invalid accountType. Must be SCHOOL or INDIVIDUAL." },
        { status: 400 }
      );
    }

    if (accountType === "SCHOOL" && !organizationName) {
      return NextResponse.json(
        { error: "organizationName is required for SCHOOL accounts." },
        { status: 400 }
      );
    }

    if (accountType === "SCHOOL" && organizationType) {
      const validTypes = ["JNV", "PMSHRI", "GOVERNMENT", "PRIVATE"];
      if (!validTypes.includes(organizationType)) {
        return NextResponse.json(
          { error: "Invalid organizationType. Must be JNV, PMSHRI, GOVERNMENT, or PRIVATE." },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existingStudent = await prisma.student.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "A student with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create student account
    const student = await prisma.student.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        isVerified: true,
        accountType,
        organizationName,
        organizationType,
      },
    });

    return NextResponse.json(
      {
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
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
