import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { runBuildCheck } from "~/server/build/node/check";
import { db } from "~/server/db/db";
import { cloneRepo } from "~/server/git/clone";
import { generateRepoSettings, getRepoSettings } from "~/server/utils/settings";

export const onboardingRouter = createTRPCRouter({
  analyzeProjectForSettings: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repoName: z.string(),
      }),
    )
    .query(
      async ({
        input: { org, repoName },
        ctx: {
          session: { accessToken },
        },
      }) => {
        const repoFullName = `${org}/${repoName}`;
        let cleanupClone: (() => Promise<void>) | undefined;

        try {
          const { path, cleanup } = await cloneRepo({
            repoName: repoFullName,
            token: accessToken,
          });
          cleanupClone = cleanup;

          const settings = await generateRepoSettings(path);
          return settings;
        } finally {
          if (cleanupClone) {
            await cleanupClone();
          }
        }
      },
    ),
  saveSettings: protectedProcedure
    .input(
      z.object({
        settings: z.any(),
        org: z.string(),
        repo: z.string(),
        evaluationData: z.any().nullable().optional(),
      }),
    )
    .mutation(async ({ input: { settings, org, repo, evaluationData } }) => {
      const project = await db.projects.findBy({
        repoFullName: `${org}/${repo}`,
      });

      if (!project) {
        throw new Error("Project not found");
      }

      await db.projects
        .find(project.id)
        .update({ settings, evaluationData: evaluationData ?? null });
    }),
  checkBuild: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repoName: z.string(),
      }),
    )
    .query(
      async ({
        input: { org, repoName },
        ctx: {
          session: { accessToken, user },
        },
      }) => {
        let cleanupClone: (() => Promise<void>) | undefined;
        let buildErrorMessage: string | undefined = "";
        try {
          const repoFullName = `${org}/${repoName}`;
          const { path, cleanup } = await cloneRepo({
            repoName: repoFullName,
            token: accessToken,
          });
          cleanupClone = cleanup;
          const repoSettings = await getRepoSettings(path, repoFullName);
          const project = await db.projects.findBy({
            repoFullName,
          });
          if (!project) {
            throw new Error("Project not found");
          }
          try {
            await runBuildCheck({
              path,
              afterModifications: false,
              repoSettings,
              projectId: project.id,
              repoFullName: repoFullName,
              userId: user.id,
            });
          } catch (error) {
            const { message } = error as Error;
            buildErrorMessage = message;
          }
        } finally {
          if (cleanupClone) {
            await cleanupClone();
          }
        }
        return buildErrorMessage;
      },
    ),
});
