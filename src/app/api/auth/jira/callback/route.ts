import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { env } from "~/env";
import { db } from "~/server/db/db";

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return new Response(`Authentication error: ${error}`, { status: 400 });
  }

  const cookieStore = req.cookies;
  const storedState = cookieStore.get("jira_oauth_state")?.value;
  const codeVerifier = cookieStore.get("jira_code_verifier")?.value;

  if (!storedState || !codeVerifier || state !== storedState) {
    return new Response("Invalid state", { status: 400 });
  }

  try {
    const tokenResponse = await fetch(
      "https://auth.atlassian.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: env.JIRA_CLIENT_ID,
          client_secret: env.JIRA_CLIENT_SECRET,
          code,
          redirect_uri: `${env.NEXTAUTH_URL}/api/auth/jira/callback`,
          code_verifier: codeVerifier,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
    }

    const { access_token } = await tokenResponse.json();

    // Store the token in the database
    await db.users.find(parseInt(session.user.id)).update({
      jiraToken: access_token,
    });

    // Clear OAuth cookies
    cookieStore.delete("jira_oauth_state");
    cookieStore.delete("jira_code_verifier");

    return Response.redirect(`${env.NEXTAUTH_URL}/dashboard`);
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return new Response("Failed to exchange code for token", { status: 500 });
  }
}
