import { z } from "zod";

export const ExtractedIssueInfoSchema = z.object({
  steps: z
    .array(
      z.object({
        stepsToAddressIssue: z.string().nullable().optional(),
        issueQualityScore: z.number().nullable().optional(),
        commitTitle: z.string().nullable().optional(),
        filesToCreate: z.array(z.string()).nullable().optional(),
        filesToUpdate: z.array(z.string()).nullable().optional(),
        plan: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

export type ExtractedIssueInfo = z.infer<typeof ExtractedIssueInfoSchema>;
