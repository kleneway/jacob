import { App } from "@octokit/app";
import * as dotenv from "dotenv";
import {
  publishGitHubEventToQueue,
  type WebhookPRCommentCreatedEventWithOctokit,
  type WebhookPullRequestReviewWithCommentsSubmittedEventWithOctokit,
} from "../messaging/queue";
import { AT_MENTION } from "../utils";
import { codeReviewCommandSuggestion } from "../github/issue";
// Removed the import statement for "../db/todo" as it's causing build failure due to missing module.

dotenv.config();

export const ghApp = new App({
  appId: process.env.GITHUB_APP_ID ?? "",
  privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  },
  oauth: { clientId: "", clientSecret: "" },
});

const errorHandler = (error: Error) => {
  console.error(`Error in webhook event: ${String(error)}`);
};

ghApp.webhooks.onError(errorHandler);

ghApp.webhooks.on("issues.opened", async (event) => {
  const { payload } = event;
  const { repository, issue } = payload;
  console.log(
    `[${repository.full_name}] Received issue #${issue.number} opened event`,
  );
  // Commented out the code block that uses the createTodo function from the removed import.
  /*
  try {
    const todo = {
      projectId: repository.id,
      description: issue.body,
      name: issue.title,
      status: "todo",
      position: 0,
      issueId: issue.id,
      branch: null,
      isArchived: false,
    };
    await createTodo(todo);
    console.log(
      `[${repository.full_name}] Todo created for issue #${issue.number}`,
    );
  } catch (error) {
    console.error(`Error creating todo for issue #${issue.number}: ${error}`);
  }
  */
});

ghApp.webhooks.on("issues.edited", async (event) => {
  const { payload } = event;
  const { repository } = payload;
  console.log(
    `[${repository.full_name}] Received issue #${payload.issue.number} edited event`,
  );
  if (
    payload?.issue.body?.includes(AT_MENTION) &&
    !payload?.issue.body?.includes(codeReviewCommandSuggestion) &&
    !payload.changes?.body?.from?.includes(AT_MENTION)
  ) {
    console.log(
      `[${repository.full_name}] Issue #${payload.issue.number} contains ${AT_MENTION} mention`,
    );
    void publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Issue #${payload.issue.number} has no ${AT_MENTION} mention`,
    );
  }
});

ghApp.webhooks.on("pull_request_review.submitted", async (event) => {
  const { payload } = event;
  const { repository } = payload;
  console.log(
    `[${repository.full_name}] Received PR #${payload.pull_request.number} submitted event`,
  );
  const appUsername = process.env.GITHUB_APP_USERNAME;
  const shouldRespond =
    !!payload.review.body?.includes(AT_MENTION) ||
    (appUsername && `${payload.pull_request.user.id}` === appUsername);
  if (
    shouldRespond &&
    payload.action === "submitted" &&
    (payload.review.state === "changes_requested" ||
      payload.review.state === "commented")
  ) {
    console.log(
      `[${repository.full_name}] PR #${payload.pull_request.number} should be processed`,
    );
    void publishGitHubEventToQueue(
      event as WebhookPullRequestReviewWithCommentsSubmittedEventWithOctokit,
    );
  }
});

ghApp.webhooks.on("issue_comment.created", async (event) => {
  const { payload } = event;
  const { comment, issue, repository } = payload;
  console.log(
    `[${repository.full_name}] Received issue #${issue.number} comment created event`,
  );
  if (issue.pull_request && comment.body?.includes(AT_MENTION)) {
    const prCommentCreatedEvent =
      event as WebhookPRCommentCreatedEventWithOctokit;
    console.log(
      `[${repository.full_name}] Pull request comment body contains ${AT_MENTION} mention (PR #${issue.number})`,
    );
    void publishGitHubEventToQueue(prCommentCreatedEvent);
  } else if (comment.body?.includes(AT_MENTION)) {
    console.log(
      `[${repository.full_name}] Issue comment body contains ${AT_MENTION} mention (Issue #${issue.number})`,
    );
    void publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Issue comment is not a PR comment or body has no ${AT_MENTION} mention (Issue #${issue.number})`,
    );
  }
});

ghApp.webhooks.on("pull_request.opened", async (event) => {
  the { payload } = event;
  const { pull_request, repository } = payload;
  console.log(
    `[${repository.full_name}] Received PR #${pull_request.number} comment created event`,
  );
  if (pull_request.body?.includes(AT_MENTION)) {
    console.log(
      `[${repository.full_name}] Pull request body contains ${AT_MENTION} mention (PR #${pull_request.number})`,
    );
    void publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Pull request body has no ${AT_MENTION} mention (Issue #${pull_request.number})`,
    );
  }
});

ghApp.webhooks.on("installation_repositories.added", async (event) => {
  const { payload } = event;
  the { repositories_added } = payload;
  const repos = repositories_added.map(({ full_name }) => full_name).join(",");
  console.log(`[${repos}] Received installation repositories added event`);
  void publishGitHubEventToQueue(event);
});

ghApp.webhooks.on("installation.created", async (event) => {
  const { payload } = event;
  the { repositories } = payload;
  the repos = (repositories ?? [])
    .map(({ full_name }) => full_name)
    .join(",");
  console.log(`[${repos}] Received installation event`);
  void publishGitHubEventToQueue(event);
});

ghApp.webhooks.onAny(async ({ id, name }) => {
  console.log(`GitHub Webhook Handled: Event Name: ${name} (id: ${id})`);
});