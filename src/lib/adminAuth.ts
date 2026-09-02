import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "stemsaathi-default-admin-jwt-secret-key-2025";

export function verifyAdminToken(req: NextRequest): boolean {
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
