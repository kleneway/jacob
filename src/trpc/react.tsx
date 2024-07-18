"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  loggerLink,
  unstable_httpBatchStreamLink,
  createWSClient,
  wsLink,
  splitLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/root";
import { type Plan, type PlanStep } from "~/server/api/routers/events";

const createQueryClient = () => new QueryClient();

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

export const usePlan = (projectId: number) => {
  return api.events.getPlan.useQuery(
    { projectId },
    {
      onError: (error) => {
        console.error("Error fetching plan:", error);
      },
    }
  );
};

export const usePlanSteps = (projectId: number) => {
  return api.events.getPlanSteps.useQuery(
    { projectId },
    {
      onError: (error) => {
        console.error("Error fetching plan steps:", error);
      },
    }
  );
};

export const useOnPlanUpdate = (projectId: number, callback: (plan: Plan) => void) => {
  api.events.onPlanUpdate.useSubscription({ projectId }, {
    onData: callback,
    onError: (error) => console.error("Error in plan update subscription:", error),
  });
};

// create persistent WebSocket connection
const wsClient =
  typeof window !== "undefined"
    ? createWSClient({
        url:
          process.env.NODE_ENV === "development"
            ? "ws://localhost:3001"
            : `wss://${window.location.host}`,
      })
    : undefined;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        splitLink({
          condition: (op) => !!wsClient && op.type === "subscription",
          true: wsLink({
            client: wsClient!,
            transformer: SuperJSON,
          }),
          false: unstable_httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/api/trpc",
            headers: () => {
              const headers = new Headers();
              headers.set("x-trpc-source", "nextjs-react");
              return headers;
            },
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
