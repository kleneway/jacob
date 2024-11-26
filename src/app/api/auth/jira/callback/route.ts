import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/db";
import { getServerAuthSession } from "@/server/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jiraState = request.cookies.get("jira_state")?.value;
  const codeVerifier = request.cookies.get("jira_code_verifier")?.value;

  if (!code || !state || !jiraState || !codeVerifier) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  if (state !== jiraState) {
    return new NextResponse("State mismatch", { status: 400 });
  }

  const clientId = process.env.JIRA_CLIENT_ID ?? "";
  const clientSecret = process.env.JIRA_CLIENT_SECRET ?? "";
  const redirectUri = process.env.JIRA_REDIRECT_URI ?? "";

  const body = {
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  };

  const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!tokenResponse.ok) {
    return new NextResponse("Failed to exchange code for token", {
      status: 500,
    });
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return new NextResponse("Invalid token response", { status: 500 });
  }

  const session = await getServerAuthSession();

  if (!session?.user) {
    return new NextResponse("Not authenticated", { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);

  await db.users.find(userId).update({
    jiraToken: accessToken,
  });

  const response = NextResponse.redirect("/dashboard");
  response.cookies.delete("jira_state");
  response.cookies.delete("jira_code_verifier");

  return response;
}
