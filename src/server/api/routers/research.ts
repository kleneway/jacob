import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const researchRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { taskId } = input;
      return ctx.db.research.findMany({
        where: {
          taskId,
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
