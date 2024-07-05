import { type Issue, type Repository } from "@octokit/webhooks-types";
import fs from "fs";
import { getTypes, getImages } from "../analyze/sourceMap";
import { getResearchByIssueId } from "../agent/research";
import {
  parseTemplate,
  type RepoSettings,
  type BaseEventData,
  getStyles,
  generateJacobBranchName,
} from "../utils";
import { addLineNumbers, getFiles, removeLineNumbers } from "../utils/files";
import { sendGptVisionRequest } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";
import { saveImages } from "../utils/images";

import {
  emitCodeEvent,
  emitPlanEvent,
  emitPlanStepEvent,
} from "../utils/events";
import { getSnapshotUrl } from "~/app/utils";
import { createPlan } from "~/server/agent/plan";
import { PlanningAgentActionType } from "~/server/db/enums";

import { sendSelfConsistencyChainOfThoughtGptRequest } from "../openai/utils";
import { addCommitAndPush } from "../git/commit";
import path from "path";
import { runBuildCheck } from "../build/node/check";

export interface EditFilesParams extends BaseEventData {
  repository: Repository;
  token: string;
  issue: Issue;
  rootPath: string;
  sourceMap: string;
  repoSettings?: RepoSettings;
}

export async function agentEditFiles(params: EditFilesParams) {
  const {
    repository,
    token,
    issue,
    rootPath,
    sourceMap,
    repoSettings,
    ...baseEventData
  } = params;
  const newBranch = generateJacobBranchName(issue.number);
  const snapshotUrl = getSnapshotUrl(issue.body);
  // Fallback to a source file list if we don't have a source map (e.g. JS projects)
  // When we start processing PRs, need to handle appending additionalComments
  const issueBody = issue.body ? `\n${issue.body}` : "";
  const issueText = `${issue.title}${issueBody}`;
  
  let research = "";
  if (issue.number) {
    const researchItems = await getResearchByIssueId(issue.number);
    research = researchItems
      .map(
        (item) =>
          `### ${item.type} \n\n#### Question: ${item.question} \n\n${item.answer}`
      )
      .join("\n\n");
  }
  
  let codePatch = "";
  const maxPlanIterations = 3;
  const maxSteps = 10;
  let planIterations = 0;
  let buildErrors = "";
  let newPrBody = "";
  while (planIterations < maxPlanIterations) {
    planIterations++;
    const plan = await createPlan(
      issueText,
      sourceMap,
      research,
      codePatch,
      buildErrors,
    );
    codePatch = "";
    buildErrors = "";
    if (!plan) {
      throw new Error("No plan generated");
    }
    await emitPlanEvent({ ...baseEventData, plan });
    if (!plan.steps?.length) {
      // No steps in the plan, so we're done
      break;
    }
    let stepNumber = 0;
    for (const step of plan.steps.slice(0, maxSteps)) {
      stepNumber++;
      const isNewFile = step.type === PlanningAgentActionType.CreateNewCode;
      await emitPlanStepEvent({ ...baseEventData, planStep: step });
      // const step = plan.steps[0];
      // if (!step) {
      //   throw new Error("No step generated");
      // }
      console.log(
        `Step ${stepNumber}: ${step.title}\n\nFile: ${step.filePath}\n\nDetails: ${step.instructions}\n\nExit Criteria${step.exitCriteria}`,
      );

      const code = isNewFile ? "" : getFiles(rootPath, [step.filePath]);

      const types = getTypes(rootPath, repoSettings);
      const packages = Object.keys(
        repoSettings?.packageDependencies ?? {},
      ).join("\n");
      const styles = await getStyles(rootPath, repoSettings);
      let images = await getImages(rootPath, repoSettings);
      images = await saveImages(images, issue?.body, rootPath, repoSettings);

      const filePlan = `Instructions for ${step.filePath}:\n\n${step.instructions}\n\nExit Criteria:\n\n${step.exitCriteria}`;

      const codeTemplateParams = {
        sourceMap,
        types,
        packages,
        styles,
        images,
        code,
        issueBody: issueText,
        research,
        plan: filePlan,
        snapshotUrl: snapshotUrl ?? "",
        codePatch,
      };

      const codeSystemPrompt = parseTemplate(
        "dev",
        "code_edit_files_diff",
        "system",
        codeTemplateParams,
      );
      const codeUserPrompt = parseTemplate(
        "dev",
        "code_edit_files_diff",
        "user",
        codeTemplateParams,
      );

      // Call sendGptRequest with the issue and concatenated code file
      const response = await sendGptVisionRequest(
        codeUserPrompt,
        codeSystemPrompt,
        snapshotUrl,
        0.2,
        baseEventData,
      );

      // Extract the patch from the response
      const patchMatch = response?.match(
        /<code_patch>([\s\S]*?)<\/code_patch>/,
      );
      const patch = patchMatch?.[1] ? patchMatch[1].trim() : "";

      if (patch) {
        // commit the file and push to the branch
        await setNewBranch({
          ...baseEventData,
          rootPath,
          branchName: newBranch,
        });

        const files = await applyCodePatch(
          rootPath,
          step.filePath,
          patch,
          isNewFile,
        );
        await Promise.all(
          files.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
        );

        await addCommitAndPush({
          ...baseEventData,
          rootPath,
          branchName: newBranch,
          commitMessage: step.title,
          token,
        });
        // Save this patch and add it to the list of other code patches
        codePatch += `\n${patch}\n`;
      } else {
        console.log("No changes were made in this step.");
      }

      console.log(`\n\n\n\n***** <code_patch>`, codePatch);
      console.log(`</code_patch> *****\n\n\n\n`);
      console.log(`[${repository.full_name}] planIterations`, planIterations);
    }
    newPrBody += `## Changes Performed:\n\n${
      plan.steps
        ?.map(
          (step, idx) =>
            `### Step ${idx + 1}: ${step.title}\n\n#### Files: \n\n${step.filePath}\n\n#### Details: \n\n${step.instructions}\n\n#### Exit Criteria\n\n${step.exitCriteria}\n\n\n`,
        )
        .join("\n\n") ?? `No plan found.`
    }`;
    // After all the code patches have been applied, run the build check
    // Save the build errors and pass them back to the next iteration
    try {
      await runBuildCheck({
        ...baseEventData,
        path: rootPath,
        afterModifications: true,
        repoSettings,
      });
    } catch (error) {
      const { message } = error as Error;
      buildErrors = message;
    }
  }

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
    newPrBody,
    newPrReviewers: issue.assignees.map((assignee) => assignee.login),
  });
}

interface FileContent {
  fileName: string;
  filePath: string;
  codeBlock: string;
}

export async function applyCodePatch(
  rootPath: string,
  filePath: string,
  patch: string,
  isNewFile = false,
): Promise<FileContent[]> {
  if (isNewFile) {
    return createNewFile(rootPath, filePath, patch);
  } else {
    return updateExistingFile(rootPath, filePath, patch);
  }
}
async function createNewFile(
  rootPath: string,
  filePath: string,
  patch: string,
): Promise<FileContent[]> {
  const files: FileContent[] = [];
  try {
    const fullFilePath = path.join(rootPath, filePath);
    const dirPath = path.dirname(fullFilePath);

    // Prepare the prompt for the LLM
    const userPrompt = `
I want to create a new file with the following patch:

${patch}

Please provide the complete file content based on this patch. Your response should:
1. Include the entire file content, not just the changed parts.
2. Remove any diff-specific syntax (like +, -, @@ lines).
3. Be surrounded by <file_content> tags.
4. Contain no additional commentary, explanations, or code blocks.

Here's an example of how your response should be formatted:

<file_content>
import React from 'react';

function App() {
  return (
    <div>
      <h1>Hello, World!</h1>
    </div>
  );
}

export default App;
