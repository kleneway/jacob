import { api } from "~/trpc/server";
import Dashboard from "./Dashboard";
import { type Task } from "~/types";

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string; developer: string };
}) => {
  const { org, repo, developer } = params;
  const tasks: Task[] = await api.events.getTasks({
    org,
    repo,
  });

  return (
    <Dashboard org={org} repo={repo} developer={developer} tasks={tasks} />
  );
};

export default DashboardPage;
