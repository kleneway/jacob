import { z } from "zod";
import { db } from "~/server/db/db";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";
import {
  createWebEvent,
  publishWebEventToQueue,
} from "~/server/messaging/queue";
import { getHasStartedCodebaseGenerationCookie } from "~/app/actions";
import { sendGptRequestWithSchema } from "~/server/openai/request";
import { standardizePath } from "~/server/utils/files";

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
        codebaseContext: z.array(z.any()),
        query: z.string(),
      }),
    )
    .mutation(
      async ({ input: { codebaseContext, query } }): Promise<ContextItem[]> => {
        return await searchCodebase(codebaseContext as ContextItem[], query);
      },
    ),
});

const searchCodebase = async (
  contextItems: ContextItem[],
  query: string,
): Promise<ContextItem[]> => {
  const SearchSchema = z.object({
    files: z.array(z.string()),
  });

  type SearchResult = z.infer<typeof SearchSchema>;

  const userPrompt = `<searchQuery>
  ${query}
  </searchQuery>
  
  Instructions:
  Please review the search query inside the <searchQuery> tag and code information. Use the file path and overview information to determine the most relevant files and return at least one and at most ten files that best match the search query starting with the most relevant as the first file (position 0) in the "files" array. Return a JSON object that adheres to the SearchSchema provided. The response must strictly follow the schema and only include the requested data. Do not include any additional text or explanations.`;

  const fileLengthSort = (a: ContextItem, b: ContextItem) => {
    return a.file.length - b.file.length;
  };

  const fileSort = (a: ContextItem, b: ContextItem) => {
    return a.file.localeCompare(b.file);
  };

  const fileOverviewData = contextItems
    .sort(fileLengthSort)
    .sort(fileSort)
    .map((item) => `${item.file}: ${item.overview}. ${item.text}\n`)
    .join("\n\n");

  const systemPrompt = `You are an AI code search engine. You will receive a search query and a list of code files with overviews. Your task is to analyze the search query and return the most relevant files from the list, ordered from most relevant to least relevant.
  
  Data:
  Here is a list of code files with a brief overview of their purpose:
  
  ${fileOverviewData}
  
  Instructions:
  - Return a JSON object that adheres to the following Zod schema:
  const SearchSchema = z.object({
    files: z.array(z.string()),
  });
  - The "files" array should contain the most likely files that match the search query, ordered from most to least likely.
  - Always return a maximum of ten files. Even if there isn't an exact match, you must return at least one file.
  - The files in the list must be from the original list of files provided; do not include any files that are not in the list.
  - Prioritize file names (minus the file extension) that are matches or very similar to the search query. Then prioritize files based on the relevance of the overview to the search query. The lowest priority files are where the search query is found in the file path.
  - Respond only with the JSON object, no additional text.`;

  const temperature = 0.1;

  const searchResult = (await sendGptRequestWithSchema(
    userPrompt,
    systemPrompt,
    SearchSchema,
    temperature,
    undefined,
    3,
    "gpt-4o-mini-2024-07-18",
  )) as unknown as SearchResult;

  if (!searchResult.files) {
    return [];
  }

  // filter the context items to only include the files in the search result
  // the context items MUST be ordered to match the search result

  const filteredContextItems = searchResult.files
    .map((file) => {
      return contextItems.find((item) =>
        standardizePath(item.file).includes(file),
      );
    })
    .filter((item): item is ContextItem => item !== undefined);

  const deDupedContextItems = filteredContextItems.filter(
    // remove duplicates
    (item, index, self) =>
      index ===
      self.findIndex(
        (t) => t.file === item.file && t.overview === item.overview,
      ),
  );

  return deDupedContextItems;
};

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
