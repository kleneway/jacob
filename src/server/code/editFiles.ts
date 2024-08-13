import { type Issue, type Repository } from "@octokit/webhooks-types";

import { getTypes, getImages } from "../analyze/sourceMap";
import {
  parseTemplate,
  constructNewOrEditSystemPrompt,
  type RepoSettings,
  type BaseEventData,
  getStyles,
  generateJacobBranchName,
} from "../utils";
import { concatenateFiles, reconstructFiles } from "../utils/files";
import {
  sendGptRequestWithSchema,
  sendGptVisionRequest,
} from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";
import { saveImages } from "../utils/images";
import {
  ExtractedIssueInfoSchema,
  type ExtractedIssueInfo,
} from "./extractedIssue";
import { emitCodeEvent } from "../utils/events";
import { getSnapshotUrl } from "~/app/utils";

export interface EditFilesParams extends BaseEventData {
  repository: Repository;
  token: string;
  issue: Issue;
  rootPath: string;
  sourceMap: string;
  repoSettings?: RepoSettings;
}

export async function editFiles(params: EditFilesParams) {
  const {
    repository,
    token,
    issue,
    rootPath,
    sourceMap,
    repoSettings,
    ...baseEventData
  } = params;
  const snapshotUrl = getSnapshotUrl(issue.body);
  // When we start processing PRs, need to handle appending additionalComments
  const issueBody = issue.body ? `\n${issue.body}` : "";
  const skipBuild = issueBody.toLowerCase().includes("[skip build]");
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
    baseEventData,
  )) as ExtractedIssueInfo;

  // TODO: handle previousAssessments
  const filesToUpdate = extractedIssue.filesToUpdate ?? [];
  const filesToCreate = extractedIssue.filesToCreate ?? [];

  console.log(`[${repository.full_name}] Files to update:`, filesToUpdate);
  console.log(`[${repository.full_name}] Files to create:`, filesToCreate);
  if (!filesToUpdate?.length && !filesToCreate?.length) {
    console.log(
      "\n\n\n\n^^^^^^\n\n\n\nERROR: No files to update or create\n\n\n\n",
    );
    throw new Error("No files to update or create");
  }
  const { code } = concatenateFiles(
    rootPath,
    undefined,
    filesToUpdate,
    extractedIssue.filesToCreate,
  );
  // console.log(`[${repository.full_name}] Concatenated code:\n\n`, code);

  const types = getTypes(rootPath, repoSettings);
  const packages = Object.keys(repoSettings?.packageDependencies ?? {}).join(
    "\n",
  );
  const styles = await getStyles(rootPath, repoSettings);
  let images = await getImages(rootPath, repoSettings);
  images = await saveImages(images, issue?.body, rootPath, repoSettings);

  // TODO: populate tailwind colors and leverage in system prompt

  const codeTemplateParams = {
    sourceMap,
    types,
    packages,
    styles,
    images,
    code,
    issueBody: issueText,
    plan: extractedIssue.stepsToAddressIssue ?? "",
    snapshotUrl: snapshotUrl ?? "",
  };

  const codeSystemPrompt = constructNewOrEditSystemPrompt(
    "code_edit_files",
    codeTemplateParams,
    repoSettings,
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_edit_files",
    "user",
    codeTemplateParams,
  );

  // Call sendGptRequest with the issue and concatenated code file
  const updatedCode = (await sendGptVisionRequest(
    codeUserPrompt,
    codeSystemPrompt,
    snapshotUrl,
    0.2,
    baseEventData,
  ))!;

  if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
    console.log(`[${repository.full_name}] code`, code);
    console.log(`[${repository.full_name}] No code generated. Exiting...`);
    throw new Error("No code generated");
  }
  const newBranch = generateJacobBranchName(issue.number);

  await setNewBranch({
    ...baseEventData,
    rootPath,
    branchName: newBranch,
  });

  const files = reconstructFiles(updatedCode, rootPath);
  await Promise.all(
    files.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
  );

  await checkAndCommit({
    ...baseEventData,
    repository,
    token,
    rootPath,
    branch: newBranch,
    repoSettings,
    commitMessage: `JACoB PR for Issue ${issue.title}`,
    issue,
    newPrTitle: `JACoB PR for Issue ${issue.title}`,
    newPrBody: `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${
      extractedIssue.stepsToAddressIssue ?? ""
    }`,
    skipBuild,
    newPrReviewers: issue.assignees.map((assignee) => assignee.login),
  });
}
