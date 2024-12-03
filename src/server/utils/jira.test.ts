import { describe, it, expect, vi } from "vitest";
import { fetchNewJiraIssues } from "./jira";
import * as evaluateIssueModule from "./evaluateIssue";
import * as dbModule from "~/server/db/db";

vi.mock("./evaluateIssue", () => ({
  evaluateJiraIssue: vi.fn(),
}));

vi.mock("~/server/db/db", () => ({
  db: {
    issues: {
      findByOptional: vi.fn(),
      create: vi.fn(),
    },
    issueBoards: {
      findBy: vi.fn(),
    },
    projects: {
      findBy: vi.fn(),
    },
  },
}));

describe("fetchNewJiraIssues", () => {
  it("should not create GitHub issue if evaluation score is less than 4", async () => {
    const mockEvaluation = {
      evaluationScore: 3.5,
      feedback: "The issue description lacks sufficient detail.",
    };

    vi.mocked(evaluateIssueModule.evaluateJiraIssue).mockResolvedValue(
      mockEvaluation,
    );

    // Mock other dependencies and API responses as needed

    // Call fetchNewJiraIssues with necessary parameters
    await fetchNewJiraIssues({
      jiraAccessToken: "fake-token",
      cloudId: "cloud-id",
      projectId: 1,
      boardId: "board-id",
      userId: 1,
      githubAccessToken: "github-token",
    });

    // Expectations
    expect(evaluateIssueModule.evaluateJiraIssue).toHaveBeenCalled();
    expect(dbModule.db.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        evaluationScore: 3.5,
        feedback: "The issue description lacks sufficient detail.",
        didCreateGithubIssue: false,
      }),
    );
    // Ensure createGitHubIssue was not called
  });

  it("should create GitHub issue if evaluation score is 4 or higher", async () => {
    const mockEvaluation = {
      evaluationScore: 4.0,
      feedback: null,
    };

    vi.mocked(evaluateIssueModule.evaluateJiraIssue).mockResolvedValue(
      mockEvaluation,
    );

    // Mock other dependencies and API responses as needed

    // Call fetchNewJiraIssues with necessary parameters
    await fetchNewJiraIssues({
      jiraAccessToken: "fake-token",
      cloudId: "cloud-id",
      projectId: 1,
      boardId: "board-id",
      userId: 1,
      githubAccessToken: "github-token",
    });

    // Expectations
    expect(evaluateIssueModule.evaluateJiraIssue).toHaveBeenCalled();
    expect(dbModule.db.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        evaluationScore: 4.0,
        feedback: null,
        didCreateGithubIssue: true,
      }),
    );
    // Ensure createGitHubIssue was called
  });
});
