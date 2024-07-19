import React, { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faClock,
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { type Task, type Plan, type PlanStep } from "@/app/api/events/route";
import { TaskStatus } from "~/server/db/enums";
import { SidebarIcon } from "~/types";
import { CodeComponent } from "./code";
import { DesignComponent } from "./Design";
import { IssueComponent } from "./Issue";
import { PlanComponent } from "./plan";
import { PromptsComponent } from "./Prompts";
import { PullRequestComponent } from "./PullRequest";
import { TerminalComponent } from "./Terminal";
import Sidebar from "../Sidebar";

interface WorkspaceProps {
  selectedIcon: SidebarIcon;
  task: Task;
  code: string;
  plan: Plan;
  planSteps: PlanStep[];
  isLoadingPlan: boolean;
}

export default function Workspace({
  selectedIcon,
  task,
  code,
  plan,
  planSteps,
  isLoadingPlan,
}: WorkspaceProps) {
  const renderComponent = () => {
    switch (selectedIcon) {
      case SidebarIcon.Plan: {
        const currentPlanStep = planSteps.length > 0 ? 0 : -1;
        return (
          <PlanComponent
            plan={plan}
            planSteps={planSteps}
            currentPlanStep={currentPlanStep}
          />
        );
      }

      case SidebarIcon.Code:
        return <CodeComponent code={code} />;
      case SidebarIcon.Terminal:
        return <TerminalComponent commands={task?.commands} />;
      case SidebarIcon.Issues:
        return <IssueComponent issue={task?.issue} />;
      case SidebarIcon.Design:
        return <DesignComponent imageUrl={task?.imageUrl} />;
      case SidebarIcon.Prompts:
        return <PromptsComponent promptDetailsArray={task.prompts} />;
      case SidebarIcon.PullRequests:
        return <PullRequestComponent pullRequest={task?.pullRequest} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex h-screen w-full flex-grow flex-col overflow-hidden">
        <div className="mt-3 flex w-full overflow-x-auto border-b border-blueGray-600 px-2">
          <div className="mr-2 flex flex-shrink-0 items-center rounded-t-md bg-slate-700 px-2 py-2 text-orange">
            <button className="max-w-[30rem] truncate text-sm">
              {task.name}
            </button>
          </div>
        </div>
        <>
          <div className="flex" style={{ height: "calc(100vh - 9rem)" }}>
            <div className="hide-scrollbar h-full w-full overflow-y-auto">
              <div className="flex h-full w-full flex-grow p-4">
                {renderComponent()}
              </div>
            </div>
          </div>
          <div className="flex h-24 border-t-2 border-blueGray-600/50 bg-black p-2 text-sm text-blueGray-400">
            {isLoadingPlan ? (
              <div className="flex w-full items-center justify-center">
                <p className="text-blueGray-400">Loading plan...</p>
              </div>
            ) : planSteps && planSteps.length > 0 ? (
              <div className="flex flex-col justify-center">
                <div className="text-blueGray-300">
                  <span className="font-semibold">
                    Current Plan Step: {planSteps[0].title}
                  </span>
                </div>
                <p className="text-blueGray-400">{planSteps[0].description}</p>
              </div>
            ) : (
              <div className="flex w-full items-center justify-center">
                <p className="text-blueGray-400">No plan steps available.</p>
              </div>
            )}
            <div className="ml-4 flex">
              <div className="mr-4">
                {task.status === TaskStatus.IN_PROGRESS && (
                  <FontAwesomeIcon
                    icon={faClock}
                    className="text-yellow-500/50"
                  />
                )}
                {task.status === TaskStatus.DONE && (
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="text-green-700"
                  />
                )}
                {task.status === TaskStatus.ERROR && (
                  <FontAwesomeIcon
                    icon={faTimesCircle}
                    className="text-red-700"
                  />
                )}
              </div>
              <div>
                <p className="text-blueGray-400">
                  {task.statusDescription}{" "}
                  {task.pullRequest && (
                    <a
                      href={task.pullRequest.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      Click Here to Review Pull Request
                    </a>
                  )}
                </p>
              </div>
            </div>
          </div>
        </>
      </div>
      <div className="h-screen border-l border-blueGray-700 ">
        <Sidebar selectedIcon={selectedIcon} onIconClick={() => {}} />
      </div>
    </>
  );
}
