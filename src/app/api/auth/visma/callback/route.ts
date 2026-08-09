import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens } from "@/lib/visma/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/?error=missing_params", request.url),
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("visma_oauth_state")?.value;
  cookieStore.delete("visma_oauth_state");

  if (state !== storedState) {
    return NextResponse.redirect(
      new URL("/?error=invalid_state", request.url),
    );
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL("/?connected=true", request.url));
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("Token exchange failed:", message);
    return NextResponse.redirect(
      new URL("/?error=token_exchange_failed", request.url),
    );
  }
}
