import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ResearchTable } from "~/server/db/tables/research.table";
import { type Research } from "~/types";

export const researchRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { taskId } = input;
      return ctx.db.research.findMany<Research[]>({
        where: {
          taskId,
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});