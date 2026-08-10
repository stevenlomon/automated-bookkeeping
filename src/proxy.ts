import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/auth/visma/callback") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("app_auth");
  if (cookie?.value === "authenticated") {
    return NextResponse.next();
  }

  const password = request.nextUrl.searchParams.get("password");
  if (password && password === process.env.APP_PASSWORD) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("app_auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  }

  return new NextResponse(
    `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb">
<form style="background:#fff;padding:2.5rem;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);width:320px">
<h1 style="font-size:1.25rem;margin:0 0 1.5rem">Bookkeeping Assistant</h1>
<input name="password" type="password" placeholder="Password" autofocus required
  style="width:100%;padding:.625rem;border:1px solid #d1d5db;border-radius:8px;font-size:.875rem;box-sizing:border-box">
<button type="submit"
  style="width:100%;margin-top:.75rem;padding:.625rem;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:.875rem;font-weight:500;cursor:pointer">
  Log in</button>
</form>
</body></html>`,
    { status: 401, headers: { "Content-Type": "text/html" } },
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
