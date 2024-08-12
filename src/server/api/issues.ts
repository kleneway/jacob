import { type Request, type Response } from "express";

import { cloneRepo } from "../git/clone";
import { getSourceMap } from "../analyze/sourceMap";
import { parseTemplate, getRepoSettings } from "../utils";
import { getIssue } from "../github/issue";

import {
  ExtractedIssueInfoSchema,
  type ExtractedIssueInfo,
} from "../code/extractedIssue";
import { sendGptRequestWithSchema } from "../openai/request";

interface QueryParams {
  repo?: string;
  issues?: string;
}

export async function getExtractedIssues(req: Request, res: Response) {
  const { authorization } = req.headers;
  const token: string | undefined = (authorization ?? "").trim().split(" ")[1];

  const { repo, issues } = req.query as Required<QueryParams>;
  const [repoOwner, repoName] = (repo ?? "").split("/");
  const issueNumbers = (issues ?? "")
    .split(",")
    .map((issue) => parseInt(issue, 10));

  if (
    !token ||
    !repo ||
    !repoOwner ||
    !repoName ||
    issueNumbers.length === 0 ||
    issueNumbers.some((issue) => isNaN(issue))
  ) {
    return res.status(400).json({ errors: ["Invalid request"] });
  }

  let cleanupClone: (() => Promise<void>) | undefined;
  try {
    const { path, cleanup } = await cloneRepo({
      repoName: repo,
      token,
    });
    cleanupClone = cleanup;

    const repoSettings = getRepoSettings(path);
    const sourceMap = getSourceMap(path, repoSettings);

    const issueData = await Promise.all(
      issueNumbers.map((issueNumber) =>
        getIssue(
          { name: repoName, owner: { login: repoOwner } },
          token,
          issueNumber,
        ),
      ),
    );

    const extractedIssues = await Promise.all(
      issueData.map(async (issue) => {
        const issueBody = issue.body ?? "";
        const issueText = `${issue.title}${issueBody}`;

        const extractedIssueTemplateParams = {
          sourceMap,
          issueText,
        };

        const extractedIssueSystemPrompt = parseTemplate(
          "dev",
          "extracted_issue",
          "system",
          extractedIssueTemplateParams,
        );
        const extractedIssueUserPrompt = parseTemplate(
          "dev",
          "extracted_issue",
          "user",
          extractedIssueTemplateParams,
        );
        const extractedIssue = (await sendGptRequestWithSchema(
          extractedIssueUserPrompt,
          extractedIssueSystemPrompt,
          ExtractedIssueInfoSchema,
          0.2,
        )) as ExtractedIssueInfo;

        return {
          issueNumber: issue.number,
          ...extractedIssue,
        };
      }),
    );

    return res.status(200).json(extractedIssues);
  } catch (error) {
    return res.status(500).json({ errors: [String(error)] });
  } finally {
    await cleanupClone?.();
  }
}
