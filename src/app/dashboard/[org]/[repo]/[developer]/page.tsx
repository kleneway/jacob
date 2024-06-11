import { api } from "~/trpc/server";
import Dashboard from "./Dashboard";
import { type TaskStatus } from "~/server/db/enums";

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string; developer: string };
}) => {
  const { org, repo, developer } = params;
  const tasks = await api.events.getTasks({
    org,
    repo,
  });

  return (
    <Dashboard
      org={org}
      repo={repo}
      developer={developer}
      tasks={tasks.map((task) => ({
        ...task,
        status: task.status as TaskStatus,
      }))}
    />
  );
};

export default DashboardPage;
