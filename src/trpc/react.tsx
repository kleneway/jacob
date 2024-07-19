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

// Add new hooks for managing Plan and PlanStep event data
export const usePlan = (projectId: number) => {
  return api.events.getPlan.useQuery({ projectId }, {
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const usePlanSteps = (projectId: number) => {
  return api.events.getPlanSteps.useQuery({ projectId }, {
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useSubscribeToPlan = (projectId: number) => {
  return api.events.onAdd.useSubscription(
    { projectId },
    {
      onData: (data) => {
        if (data.type === 'plan' || data.type === 'plan_step') {
          api.useContext().events.getPlan.invalidate({ projectId });
          api.useContext().events.getPlanSteps.invalidate({ projectId });
        }
      },
    }
  );
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
