import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Make This Look Mine", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(request: NextRequest) {
  const authenticationEnabled = process.env.BASIC_AUTH_ENABLED === "true";
  if (!authenticationEnabled) return NextResponse.next();

  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;
  const expectedUsername = process.env.BASIC_AUTH_USERNAME ?? "stylist";
  const authorization = request.headers.get("authorization");

  if (!expectedPassword || !authorization?.startsWith("Basic "))
    return unauthorized();

  try {
    const credentials = atob(authorization.slice(6));
    const separator = credentials.indexOf(":");
    const username = separator >= 0 ? credentials.slice(0, separator) : "";
    const password = separator >= 0 ? credentials.slice(separator + 1) : "";
    if (username === expectedUsername && password === expectedPassword)
      return NextResponse.next();
  } catch {
    // Invalid credentials use the same challenge as missing credentials.
  }

  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
