import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "stemsaathi-default-admin-jwt-secret-key-2025";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function verifyToken(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Image file is required." },
        { status: 400 }
      );
    }

    // Allow only common product image formats
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid image format. Only JPG, JPEG, PNG and WEBP are allowed.",
        },
        { status: 400 }
      );
    }

    // 10 MB maximum
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Image size must be less than 10 MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<any>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "stemsaathi/products",
            resource_type: "image",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error("Cloudinary upload failed."));
            }
          }
        );

        uploadStream.end(buffer);
      }
    );

    return NextResponse.json(
      {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    return NextResponse.json(
      {
        error: "Failed to upload image to Cloudinary.",
      },
      { status: 500 }
    );
  }
}