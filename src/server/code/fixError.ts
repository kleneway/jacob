import { type Issue, type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";
import { dedent } from "ts-dedent";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import {
  type RepoSettings,
  type BaseEventData,
  parseTemplate,
  extractIssueNumberFromBranchName,
} from "../utils";
import { assessBuildError } from "./assessBuildError";
import { runNpmInstall } from "../build/node/check";
import { checkAndCommit } from "./checkAndCommit";
import { addCommentToIssue, getIssue } from "../github/issue";
import { concatenatePRFiles } from "../github/pr";
import { reconstructFiles } from "../utils/files";
import { emitCodeEvent } from "~/server/utils/events";
import { sendGptRequest } from "../openai/request";

export type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
type RetrievedIssue =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];

export interface FixErrorParams extends BaseEventData {
  repository: Repository;
  token: string;
  prIssue: Issue | null;
  body: string | null;
  rootPath: string;
  branch: string;
  existingPr: PullRequest;
  repoSettings?: RepoSettings;
}

export async function fixError(params: FixErrorParams) {
  const {
    repository,
    token,
    prIssue,
    body,
    rootPath,
    branch,
    repoSettings,
    existingPr,
    ...baseEventData
  } = params;

  const issueNumber = extractIssueNumberFromBranchName(branch);
  let issue: RetrievedIssue | undefined;
  if (issueNumber) {
    const result = await getIssue(repository, token, issueNumber);
    issue = result;
    console.log(
      `[${repository.full_name}] Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
    );
  } else {
    console.log(
      `[${repository.full_name}] No Issue associated with ${branch} branch for PR #${existingPr?.number}`,
    );
  }

  const buildErrorSection = (body?.split("## Error Message") ?? [])[1];
  const headingEndMarker = "\n```\n";
  const afterHeadingIndex = (buildErrorSection ?? "").indexOf(headingEndMarker);
  const restOfHeading =
    afterHeadingIndex === -1
      ? ""
      : buildErrorSection?.slice(0, afterHeadingIndex) ?? "";
  const attemptNumber =
    parseInt(restOfHeading.match(/Attempt\s+Number\s+(\d+)/)?.[1] ?? "", 10) ||
    1;
  const endOfErrorSectionMarker = "```";
  const errors =
    afterHeadingIndex === -1
      ? ""
      : (
          buildErrorSection?.slice(
            afterHeadingIndex + headingEndMarker.length,
          ) ?? ""
        ).split(endOfErrorSectionMarker)[0] ?? "";
  console.log(`[${repository.full_name}] Errors:`, errors);
  console.log(`here is what will be outputted:  afterHeadingIndex,
    headingEndMarker,
    restOfHeading,
    attemptNumber,
    endOfErrorSectionMarker`);
  console.log(
    afterHeadingIndex,
    headingEndMarker,
    restOfHeading,
    attemptNumber,
    endOfErrorSectionMarker,
  );

  const sourceMap = getSourceMap(rootPath, repoSettings);
  const assessment = await assessBuildError({
    ...baseEventData,
    sourceMap,
    errors,
  });
  console.log(`[${repository.full_name}] Assessment of Error:`, assessment);

  try {
    const commitMessageBase = "JACoB fix error: ";
    const commitMessage = `${commitMessageBase}${assessment.errors?.[0]?.error ?? ""}`;

    if (assessment.needsNpmInstall && assessment.npmPackageToInstall) {
      console.log(`[${repository.full_name}] Needs npm install`);

      await runNpmInstall({
        ...baseEventData,
        path: rootPath,
        packageName: assessment.npmPackageToInstall.trim(),
        repoSettings,
      });

      await checkAndCommit({
        ...baseEventData,
        repository,
        token,
        rootPath,
        branch,
        repoSettings,
        commitMessage,
        existingPr,
        issue,
        buildErrorAttemptNumber: attemptNumber,
      });
    } else {
      const { code } = await concatenatePRFiles(
        rootPath,
        repository,
        token,
        existingPr.number,
        undefined,
        assessment.filesToUpdate,
      );

      const { errors = [] } = assessment;

      const errorMessages = errors
        ?.map(
          ({ filePath, startingLineNumber, endingLineNumber, error, code }) =>
            `Error in ${filePath} (${startingLineNumber}-${endingLineNumber}): ${error}. Code: ${code}`,
        )
        .join("\n");

      const types = getTypes(rootPath, repoSettings);
      const images = await getImages(rootPath, repoSettings);

      const codeTemplateParams = {
        code,
        issueBody: issue?.body ?? "",
        errorMessages,
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
      const updatedCode = await sendGptRequest(
        codeUserPrompt,
        codeSystemPrompt,
        0.2,
        baseEventData,
      );

      if (
        !updatedCode ||
        updatedCode.length < 10 ||
        !updatedCode.includes("__FILEPATH__")
      ) {
        console.log(`[${repository.full_name}] code`, code);
        console.log(`[${repository.full_name}] No code generated. Exiting...`);
        throw new Error("No code generated");
      }

      const files = reconstructFiles(updatedCode, rootPath);
      await Promise.all(
        files.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
      );

      await checkAndCommit({
        ...baseEventData,
        repository,
        token,
        rootPath,
        branch,
        repoSettings,
        commitMessage,
        existingPr,
        issue,
        buildErrorAttemptNumber: attemptNumber,
      });
    }
  } catch (error: unknown) {
    if (prIssue) {
      const message = dedent`JACoB here once again...

        Unfortunately, I wasn't able to resolve the error(s).

        Here is some information about the error(s):
        
        ${(assessment.errors ?? [])
          .map(
            ({ filePath, startingLineNumber, endingLineNumber, error, code }) =>
              `Error in ${filePath} (${startingLineNumber}-${endingLineNumber}): ${error}. Code: ${code}`,
          )
          .join("\n")}
      `;

      await addCommentToIssue(repository, prIssue.number, token, message);
    }
    throw error;
  }
}
