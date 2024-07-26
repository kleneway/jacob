import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { type ResearchTable } from "~/server/db/tables/research.table";

export const researchRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { taskId } = input;
      return (ctx.db.research as ResearchTable).findMany({
        where: {
          taskId,
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
