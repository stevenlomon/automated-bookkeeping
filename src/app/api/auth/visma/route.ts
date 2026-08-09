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

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.VISMA_CLIENT_ID!,
    redirect_uri: process.env.VISMA_REDIRECT_URI!,
    scope: VISMA_CONFIG.scopes,
    state,
  });

  return NextResponse.redirect(
    `${VISMA_CONFIG.authorizeUrl}?${params.toString()}`,
  );
}
