import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const clientId = process.env.JIRA_CLIENT_ID;
  const redirectUri = process.env.JIRA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new NextResponse("Jira client ID or redirect URI is not set", {
      status: 500,
    });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(64).toString("hex");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const authorizationUrl =
    `https://auth.atlassian.com/authorize` +
    `?audience=api.atlassian.com` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent("read:jira-user read:jira-work")}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code` +
    `&prompt=consent` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("jira_code_verifier", codeVerifier, { httpOnly: true });
  response.cookies.set("jira_state", state, { httpOnly: true });

  return response;
}
