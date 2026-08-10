import { NextResponse } from "next/server";
import { VISMA_CONFIG } from "@/lib/visma/config";

export async function GET() {
  const clientId = process.env.VISMA_CLIENT_ID ?? "";
  const redirectUri = process.env.VISMA_REDIRECT_URI ?? "";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: VISMA_CONFIG.scopes,
    state: "debug",
  });

  return NextResponse.json({
    env: {
      VISMA_CLIENT_ID: clientId ? `${clientId.slice(0, 6)}...` : "NOT SET",
      VISMA_CLIENT_SECRET: process.env.VISMA_CLIENT_SECRET
        ? "SET (hidden)"
        : "NOT SET",
      VISMA_REDIRECT_URI: redirectUri || "NOT SET",
    },
    authorizeUrl: `${VISMA_CONFIG.authorizeUrl}?${params.toString()}`,
  });
}
