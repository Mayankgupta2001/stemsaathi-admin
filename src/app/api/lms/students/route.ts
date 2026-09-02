import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            enrollments: true,
            progress: true,
            payments: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json({ error: "Failed to fetch students." }, { status: 500 });
  }
}
