import { type Issue, type Repository } from "@octokit/webhooks-types";

import { getTypes, getImages } from "../analyze/sourceMap";
import { traverseCodebase } from "../analyze/traverse";
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
  const sourceMapOrFileList = sourceMap || (await traverseCodebase(rootPath));
  const issueBody = issue.body ? `\n${issue.body}` : "";
  const issueText = `${issue.title}${issueBody}`;

  const extractedIssueTemplateParams = {
    sourceMap: sourceMapOrFileList,
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

  const steps = extractedIssue.steps ?? [];

  if (!steps.length) {
    console.log("\n\n\n\n^^^^^^\n\n\n\nERROR: No steps to process\n\n\n\n");
    throw new Error("No steps to process");
  }

  for (const step of steps) {
    const { filesToUpdate, filesToCreate, plan } = step;
    const files = filesToUpdate ?? filesToCreate ?? [];

    if (!files.length) {
      console.log(
        "\n\n\n\n^^^^^^\n\n\n\nERROR: No files to update or create in step\n\n\n\n",
      );
      throw new Error("No files to update or create in step");
    }

    const { code } = concatenateFiles(
      rootPath,
      undefined,
      filesToUpdate,
      filesToCreate,
    );

    const types = getTypes(rootPath, repoSettings);
    const packages = Object.keys(repoSettings?.packageDependencies ?? {}).join(
      "\n",
    );
    const styles = await getStyles(rootPath, repoSettings);
    let images = await getImages(rootPath, repoSettings);
    images = await saveImages(images, issue?.body, rootPath, repoSettings);

    const codeTemplateParams = {
      sourceMap: sourceMapOrFileList,
      types,
      packages,
      styles,
      images,
      code,
      issueBody: issueText,
      plan,
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

    const filesToEmit = reconstructFiles(updatedCode, rootPath);
    await Promise.all(
      filesToEmit.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
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
      newPrBody: `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${plan}`,
      newPrReviewers: issue.assignees.map((assignee) => assignee.login),
    });
  }
}
