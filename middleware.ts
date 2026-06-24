import { NextRequest, NextResponse } from "next/server";

const ADMIN_BASIC_AUTH_USER = process.env.ADMIN_BASIC_AUTH_USER;
const ADMIN_BASIC_AUTH_PASSWORD = process.env.ADMIN_BASIC_AUTH_PASSWORD;

function isBasicAuthEnabled() {
  return Boolean(ADMIN_BASIC_AUTH_USER && ADMIN_BASIC_AUTH_PASSWORD);
}

function decodeBasicAuth(value: string) {
  const [scheme, credentials] = value.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !credentials) return null;

  try {
    const decoded = atob(credentials);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    return {
      user: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const credentials = decodeBasicAuth(authHeader);
  if (!credentials) return false;

  return (
    credentials.user === ADMIN_BASIC_AUTH_USER &&
    credentials.password === ADMIN_BASIC_AUTH_PASSWORD
  );
}

export function middleware(request: NextRequest) {
  if (!isBasicAuthEnabled() || isAuthorized(request)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Carpool Admin"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
