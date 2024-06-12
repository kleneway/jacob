import { z } from "zod";

export const ExtractedIssueInfoSchema = z.object({
  stepsToAddressIssue: z
    .array(
      z.object({
        description: z.string().nullable().optional(), // a description of the step to address the issue
        filesToCreate: z.array(z.string()).nullable().optional(), // an array of file paths that will be created by the developer. The paths CANNOT be in the source map's list of valid file names.
        filesToUpdate: z.array(z.string()).nullable().optional(), // an array of file paths that will be updated by the developer. The paths MUST be in the source map's list of valid file names.
      }),
    )
    .nullable()
    .optional(),
  issueQualityScore: z.number().nullable().optional(), // a score from 0 to 5 indicating the quality of the GitHub issue and the confidence that a large language model can generate the correct code to address this issue on its first attempt. Use the evaluation criteria to determine the score.
  commitTitle: z.string().nullable().optional(), // a brief git commit title no longer than 50 characters explaining the changes that need to be made
});

export type ExtractedIssueInfo = z.infer<typeof ExtractedIssueInfoSchema>;
