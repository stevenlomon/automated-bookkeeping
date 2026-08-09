import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/visma/auth";

export async function GET() {
  const connected = await isAuthenticated();
  return NextResponse.json({ connected });
}
