import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { VISMA_CONFIG } from "@/lib/visma/config";

export async function GET() {
  const state = randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("visma_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const clientId = encodeURIComponent(process.env.VISMA_CLIENT_ID!);
  const redirectUri = encodeURIComponent(process.env.VISMA_REDIRECT_URI!);
  const scope = encodeURIComponent(VISMA_CONFIG.scopes);

  return NextResponse.redirect(
    `${VISMA_CONFIG.authorizeUrl}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`,
  );
}
