import { type NextRequest } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db/db";
import { TodoStatus } from "~/server/db/enums";

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const webhookSecret = req.headers.get("x-atlassian-webhook-token");
  if (webhookSecret !== env.JIRA_WEBHOOK_SECRET) {
    return new Response("Invalid webhook secret", { status: 401 });
  }

  try {
    const payload = await req.json();

    // Only process issue creation events
    if (payload.webhookEvent !== "jira:issue_created") {
      return new Response("Event type not supported", { status: 200 });
    }

    const issue = payload.issue;
    const project = await db.projects.findBy({
      repoFullName: issue.fields.project.key,
    });

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    // Check if todo already exists for this issue
    const existingTodo = await db.todos.findByOptional({
      projectId: project.id,
      issueId: issue.id,
    });

    if (existingTodo) {
      return new Response("Todo already exists", { status: 200 });
    }

    // Create new todo
    await db.todos.create({
      projectId: project.id,
      description: `${issue.fields.summary}\n\n${issue.fields.description || ""}`,
      name: issue.fields.summary,
      status: TodoStatus.TODO,
      issueId: issue.id,
      position: issue.id,
    });

    return new Response("Todo created successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing Jira webhook:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
