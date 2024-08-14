import { z } from "zod";

export const ExtractedIssueInfoSchema = z.object({
  stepsToAddressIssue: z.string().nullable().optional(), // a step-by-step plan of how a developer would address the given issue
  issueQualityScore: z.number().nullable().optional(), // a score from 0 to 5 indicating the quality of the GitHub issue and the confidence that a large language model can generate the correct code to address this issue on its first attempt. Use the evaluation criteria to determine the score.
  skipBuild: z.boolean().optional(), // a flag indicating whether to skip the build process
  commitTitle: z.string().nullable().optional(), // a brief git commit title no longer than 50 characters explaining the changes that need to be made
  filesToCreate: z.array(z.string()).nullable().optional(), // an array of file paths that will be created by the developer. The paths CANNOT be in the source map's list of valid file names.
  filesToUpdate: z.array(z.string()).nullable().optional(), // an array of file paths that will be updated by the developer. The paths MUST be in the source map's list of valid file names.
});

export type ExtractedIssueInfo = z.infer<typeof ExtractedIssueInfoSchema>;
