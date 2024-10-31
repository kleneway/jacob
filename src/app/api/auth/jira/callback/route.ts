import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db/db";
import { env } from "~/env";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 },
    );
  }

  // Validate state (you should implement a proper state validation mechanism)
  // This is a placeholder for demonstration purposes
  // if (state !== "your_stored_state") {
  //   return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  // }

  try {
    console.log("code", code);
    console.log("env.JIRA_CLIENT_ID", env.JIRA_CLIENT_ID);
    console.log("env.JIRA_CLIENT_SECRET", env.JIRA_CLIENT_SECRET);
    console.log("env.NEXTAUTH_URL", env.NEXTAUTH_URL);
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
          code: code,
          redirect_uri: `${env.NEXTAUTH_URL}/api/auth/jira/callback`,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log("accessToken", accessToken);
    console.log("tokenData", tokenData);

    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const userId = parseInt(session.user.id);
    console.log("userId", userId);

    await db.users.find(userId).update({
      jiraToken: accessToken,
    });

    return NextResponse.redirect(`${env.NEXTAUTH_URL}/dashboard`);
  } catch (error) {
    console.error("Error in Jira OAuth callback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
