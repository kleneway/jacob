import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TodoStatus } from "~/server/db/enums";

export const todoRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.todo.findMany();
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
      const newTodo = await ctx.prisma.todo.create({
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
      const updatedTodo = await ctx.prisma.todo.update({
        where: { id: input.id },
        data: input,
      });
      return updatedTodo;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.todo.delete({
        where: { id: input.id },
      });
      return { success: true, message: "Todo deleted successfully" };
    }),
});
