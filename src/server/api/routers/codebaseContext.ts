import { z } from "zod";
import { db } from "~/server/db/db";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { searchCodebase } from "~/server/ai/search";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";
import {
  createWebEvent,
  publishWebEventToQueue,
} from "~/server/messaging/queue";
import { getHasStartedCodebaseGenerationCookie } from "~/app/actions";

export const codebaseContextRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
        branch: z.string().optional(),
        commitHash: z.string().optional(),
      }),
    )
    .query(
      async ({
        input: { org, repo, branch, commitHash },
        ctx: {
          session: { accessToken },
        },
      }): Promise<ContextItem[]> => {
        // TODO: pass in the branch and commit hash, need to re-generate the context if they change
        try {
          const project = await db.projects.findBy({
            repoFullName: `${org}/${repo}`,
          });
          const codebaseContext = await db.codebaseContext
            .where({ projectId: project?.id })
            .order({ filePath: "ASC" })
            .all();
          // If there's no context, generate it
          const hasStarted = await getHasStartedCodebaseGenerationCookie(
            org,
            repo,
            branch,
            commitHash,
          );
          if (codebaseContext.length === 0 && !hasStarted) {
            await generateCodebaseContext(org, repo, accessToken);
          }
          return (
            codebaseContext?.map((context) => context.context as ContextItem) ??
            []
          );
        } catch (error) {
          console.log("Error generating codebase context:", error);
          console.error("Error generating codebase context:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
          });
        } finally {
        }
      },
    ),

  getByFilePath: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        filePath: z.string(),
      }),
    )
    .query(
      async ({
        input: { projectId, filePath },
      }): Promise<ContextItem | null> => {
        const existingContext =
          (await db.codebaseContext.findByOptional({
            projectId,
            filePath,
          })) ?? null;

        return (existingContext?.context as ContextItem) ?? null;
      },
    ),
  generateCodebaseContext: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repoName: z.string(),
      }),
    )
    .mutation(
      async ({
        input: { org, repoName },
        ctx: {
          session: { accessToken },
        },
      }): Promise<void> => {
        await generateCodebaseContext(org, repoName, accessToken);
      },
    ),
  searchCodebase: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
        query: z.string(),
      }),
    )
    .query(
      async ({
        input: { org, repo, query },
        ctx: {
          session: { accessToken },
        },
      }): Promise<ContextItem[]> => {
        if (!accessToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          });
        }
        return await searchCodebase(org, repo, query, accessToken);
      },
    ),
});

const generateCodebaseContext = async (
  org: string,
  repoName: string,
  accessToken: string,
): Promise<void> => {
  const octokit = new Octokit({ auth: accessToken });

  if (!org || !repoName) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid request",
    });
  }

  // Call Octokit to get the repository
  const { data: repository } = await octokit.rest.repos.get({
    owner: org,
    repo: repoName,
  });
  const repoFullName = repository.full_name;

  const webEvent = createWebEvent({
    repoId: repository.id,
    repoFullName,
    action: "generate_context",
    token: accessToken,
    params: {
      repository,
    },
  });

  await publishWebEventToQueue(webEvent);
};
