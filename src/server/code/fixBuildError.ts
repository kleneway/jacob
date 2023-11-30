import { Issue, Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";
import dedent from "ts-dedent";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate } from "../utils";
import { sendGptRequest } from "../openai/request";
import { assessBuildError } from "./assessBuildError";
import { runNpmInstall } from "../build/node/check";
import { checkAndCommit } from "./checkAndCommit";
import { addCommentToIssue, getIssue } from "../github/issue";
import { getPRFiles } from "../github/pr";
import { concatenateFiles, reconstructFiles } from "../utils/files";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export async function fixBuildError(
  repository: Repository,
  token: string,
  prIssue: Issue | null,
  body: string | null,
  rootPath: string,
  branch: string,
  existingPr: PullRequest,
) {
  const regex = /otto-issue-(\d+)-.*/;
  const match = branch.match(regex);
  const issueNumber = parseInt(match?.[1] ?? "", 10);
  const result = await getIssue(repository, token, issueNumber);
  console.log(
    `Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
  );
  const issue = result.data;

  const buildErrorSection = (body?.split("## Error Message:\n\n") ?? [])[1];
  const buildError = (buildErrorSection ?? "").split("## ")[0];

  const assessment = await assessBuildError(buildError);
  console.log("Assessment of Error:", assessment);

  try {
    if (assessment.needsNpmInstall && assessment.npmPackageToInstall) {
      console.log("Needs npm install");

      await runNpmInstall(rootPath, assessment.npmPackageToInstall.trim());

      await checkAndCommit({
        repository,
        token,
        rootPath,
        branch,
        commitMessage: "Otto commit: fix build error",
        existingPr,
        issue,
      });
    } else {
      const prFiles = await getPRFiles(repository, token, existingPr.number);
      const filesToUpdate = prFiles.data.map(({ filename }) => filename);

      console.log("Files to update:", filesToUpdate);
      if (!filesToUpdate?.length) {
        console.log("\n\n\n\n^^^^^^\n\n\n\nERROR: No files to update\n\n\n\n");
        throw new Error("No files to update");
      }
      const code = concatenateFiles(rootPath, filesToUpdate);
      console.log("Concatenated code:\n\n", code);

      const { causeOfError, ideasForFixingError, suggestedFix } = assessment;
      const sourceMap = getSourceMap(rootPath);
      const types = getTypes(rootPath);
      const images = getImages(rootPath);

      const codeTemplateParams = {
        code,
        issueBody: issue.body ?? "",
        causeOfError,
        ideasForFixingError,
        suggestedFix,
        sourceMap,
        types,
        images,
      };

      const codeSystemPrompt = parseTemplate(
        "dev",
        "code_fix_error",
        "system",
        codeTemplateParams,
      );
      const codeUserPrompt = parseTemplate(
        "dev",
        "code_fix_error",
        "user",
        codeTemplateParams,
      );
      const updatedCode = (await sendGptRequest(
        codeUserPrompt,
        codeSystemPrompt,
        0.2,
      )) as string;

      if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
        console.log("code", code);
        console.log("No code generated. Exiting...");
        throw new Error("No code generated");
      }

      // if the first line of the diff starts with ``` then it is a code block. Remove the first line.
      // TODO: move this to the prompt and accept an answer that can be parsed with Zod. If it fails validation, try again with the validation error message.
      const realCode = updatedCode.startsWith("```")
        ? updatedCode.split("```").slice(1).join("")
        : updatedCode;

      reconstructFiles(realCode, rootPath);

      await checkAndCommit({
        repository,
        token,
        rootPath,
        branch,
        commitMessage: "Otto commit: fix build error",
        existingPr,
        issue,
      });
    }
  } catch (error) {
    if (prIssue) {
      const message = dedent`Otto here once again...

        Unfortunately, I wasn't able to resolve this build error.

        Here is some information about the error:
        
        ${assessment.causeOfError}

        Here are some ideas for fixing the error:
        
        ${assessment.ideasForFixingError}

        Here is the suggested fix:
        
        ${assessment.suggestedFix}
      `;

      await addCommentToIssue(repository, prIssue.number, token, message);
    }
    throw error;
  }
}