import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TodosTable } from "~/server/db/tables/todos.table";
import { TodoStatus } from "~/server/db/enums";

export const todoRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.todosTable.findMany();
  }),

  create: protectedProcedure
    .input(
      z.object({
        description: z.string(),
        name: z.string(),
        status: z.nativeEnum(TodoStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const newTodo = await ctx.prisma.todosTable.create({
        data: {
          description: input.description,
          name: input.name,
          status: input.status,
        },
      });
      return newTodo;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().optional(),
        name: z.string().optional(),
        status: z.nativeEnum(TodoStatus).optional(),
        issueId: z.number().nullable().optional(),
        stepsToAddressIssue: z.string().nullable().optional(),
        issueQualityScore: z.number().nullable().optional(),
        commitTitle: z.string().nullable().optional(),
        filesToCreate: z.array(z.string()).nullable().optional(),
        filesToUpdate: z.array(z.string()).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedTodo = await ctx.prisma.todosTable.update({
        where: { id: input.id },
        data: input,
      });
      return updatedTodo;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.todosTable.delete({
        where: { id: input.id },
      });
      return { success: true, message: "Todo deleted successfully" };
    }),
});
