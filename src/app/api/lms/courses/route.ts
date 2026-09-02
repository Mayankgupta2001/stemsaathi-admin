import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

const collapseRepeatedText = (value: string) => {
  const text = value.trim();
  if (!text) return "";

  for (let size = 1; size <= Math.floor(text.length / 2); size++) {
    if (text.length % size !== 0) continue;
    const chunk = text.slice(0, size);
    if (chunk.repeat(text.length / size) === text) {
      return chunk;
    }
  }

  return text;
};

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: "Failed to fetch courses." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const description = collapseRepeatedText(String(body?.description || ""));
    const thumbnail = body?.thumbnail ? String(body.thumbnail).trim() : null;
    const price = Number(body?.price ?? 0);
    const isPublished = Boolean(body?.isPublished);

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid non-negative number." }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        thumbnail,
        price: Math.round(price),
        isPublished,
      },
      include: { modules: true },
    });

    return NextResponse.json({ success: true, course }, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json({ error: "Failed to create course." }, { status: 500 });
  }
}
