import { promises as fs } from "fs";
import path from "path";
import { VISMA_CONFIG } from "./config";

// I wanna properly unpack and dissect this Claude Code generated code once me and my brother have a working prototype. For now all I need
// to know is that `access_token` and `refresh_token` that I got when going through the OAuth flow manually, along with an `expires_in` are
// dynamic variables rather than static - they're runtime tokens - generated with the help of the three static variables stored in .evn.local

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

const TOKEN_FILE = path.join(process.cwd(), ".tokens.json");
const EXPIRY_BUFFER_MS = 60_000;

async function readTokens(): Promise<StoredTokens | null> {
  try {
    const data = await fs.readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeTokens(tokens: StoredTokens): Promise<void> {
  await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf-8");
}

function basicAuthHeader(): string {
  const clientId = process.env.VISMA_CLIENT_ID;
  const clientSecret = process.env.VISMA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("VISMA_CLIENT_ID and VISMA_CLIENT_SECRET must be set");
  }
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<StoredTokens> {
  const redirectUri = process.env.VISMA_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("VISMA_REDIRECT_URI must be set");
  }

  const response = await fetch(VISMA_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${body}`);
  }

  const data = await response.json();

  const tokens: StoredTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  await writeTokens(tokens);
  return tokens;
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<StoredTokens> {
  const response = await fetch(VISMA_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${body}`);
  }

  const data = await response.json();

  const tokens: StoredTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  await writeTokens(tokens);
  return tokens;
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = await readTokens();
  if (!tokens) {
    throw new Error("No tokens stored. Complete the OAuth flow first.");
  }

  if (Date.now() < tokens.expires_at - EXPIRY_BUFFER_MS) {
    return tokens.access_token;
  }

  const refreshed = await refreshAccessToken(tokens.refresh_token);
  return refreshed.access_token;
}

export async function isAuthenticated(): Promise<boolean> {
  const tokens = await readTokens();
  return tokens !== null;
}
