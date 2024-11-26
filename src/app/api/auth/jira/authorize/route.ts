import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { env } from "~/env";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const state = randomBytes(32).toString("hex");
  const codeVerifier = randomBytes(32).toString("hex");

  // Store state and code verifier in session/cookie
  const cookieStore = req.cookies;
  cookieStore.set("jira_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
  cookieStore.set("jira_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  const authUrl = new URL("https://auth.atlassian.com/authorize");
  authUrl.searchParams.set("audience", "api.atlassian.com");
  authUrl.searchParams.set("client_id", env.JIRA_CLIENT_ID);
  authUrl.searchParams.set(
    "scope",
    "read:jira-user read:jira-work write:jira-work",
  );
  authUrl.searchParams.set(
    "redirect_uri",
    `${env.NEXTAUTH_URL}/api/auth/jira/callback`,
  );
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("prompt", "consent");

  return Response.redirect(authUrl.toString());
}
