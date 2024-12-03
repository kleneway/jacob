import { type change } from "postgres-migrations";

export async function up(pgm: change) {
  pgm.addColumns("issues", {
    jiraIssueDescription: {
      type: "text",
      notNull: false,
    },
    evaluationScore: {
      type: "numeric",
      notNull: false,
    },
    feedback: {
      type: "text",
      notNull: false,
    },
    didCreateGithubIssue: {
      type: "boolean",
      notNull: true,
      default: false,
    },
  });
}
