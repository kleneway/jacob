import { z } from "zod";
import { db } from "~/server/db/db";
import { TodoStatus } from "~/server/db/enums";
import { ResearchAgentActionType } from "~/server/agent/research";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type Todo } from "./events";
import { DEVELOPERS } from "~/data/developers";
import { Mode } from "~/types";

export const todoRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        developerId: z.string(),
      }),
    )
    .query(async ({ input: { projectId, developerId } }): Promise<Todo[]> => {
      const mode = DEVELOPERS.find((dev) => dev.id === developerId)?.mode;
      if (mode === Mode.EXISTING_ISSUES) {
        const todos = await db.todos
          .where({ projectId, isArchived: false })
          .order({ position: "ASC" })
          .all();
        return todos;
      } else {
        return [];
      }
    }),

  getById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ input: { id } }): Promise<Todo> => {
      const todo = await db.todos.find(id);
      return todo;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        description: z.string(),
        name: z.string(),
        status: z.nativeEnum(TodoStatus),
        issueId: z.number().nullable(),
        branch: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }): Promise<Todo> => {
      const { projectId, description, name, status, issueId, branch } = input;

      let existingResearch = null;
      if (issueId) {
        existingResearch = await db.research.where({ issueId }).first();
      }

      return await db.$transaction(async (trx) => {
        const createdTodo = await trx.todos.selectAll().insert({
          projectId,
          description,
          name,
          status,
          issueId,
          branch,
        });

        if (existingResearch) {
          await trx.research
            .find(existingResearch.id)
            .update({ todoId: createdTodo.id });
        } else if (issueId) {
          await trx.research.insert({
            todoId: createdTodo.id,
            issueId,
            type: ResearchAgentActionType.ResearchCodebase,
            question: "Initial research",
            answer: "Pending",
          });
        }

        return createdTodo;
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        description: z.string().optional(),
        name: z.string().optional(),
        status: z.nativeEnum(TodoStatus).optional(),
        issueId: z.number().optional(),
        branch: z.string().optional(),
        isArchived: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...updates } }): Promise<Todo> => {
      const updatedTodo = await db.todos.selectAll().find(id).update(updates);
      return updatedTodo;
    }),

  archive: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input: { id } }): Promise<Todo> => {
      const archivedTodo = await db.todos
        .selectAll()
        .find(id)
        .update({ isArchived: true });
      return archivedTodo;
    }),

  updatePosition: protectedProcedure
    .input(z.array(z.number()))
    .mutation(async ({ input: ids }): Promise<void> => {
      await db.$transaction(async () => {
        // Update the position of each todo
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (!id) continue;
          await db.todos.find(id).update({ position: i + 1 });
        }
      });
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input: { id } }): Promise<{ id: number }> => {
      await db.todos.find(id).delete();
      return { id };
    }),
});
