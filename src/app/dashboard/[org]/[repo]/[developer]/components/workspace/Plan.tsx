import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircle,
  faCircleDot,
} from "@fortawesome/free-solid-svg-icons";
import { type Plan, type PlanStep } from "~/server/api/routers/events";

type ComponentProps = {
  plan: Plan | undefined;
  planSteps: PlanStep[];
  currentPlanStep: number;
};

export const PlanComponent: React.FC<ComponentProps> = ({
  planSteps,
  currentPlanStep,
}) => (
  <div className="w-full bg-blueGray-900 p-2 pt-0 text-gray-100">
    <h2 className="border-b border-blueGray-700 py-2 text-lg font-semibold">
      Plan
    </h2>
    {planSteps.length > 0 ? (
      <div className="grid w-full grid-cols-1 gap-4 p-2 md:grid-cols-2 lg:grid-cols-3">
        {planSteps.map((step: PlanStep, idx: number) => {
          const isCurrentStep = !step.isComplete && idx === currentPlanStep;
          return (
            <div
              key={step.id}
              className={`relative max-w-sm transform rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out hover:scale-105 ${
                idx === currentPlanStep
                  ? "bg-blueGray-700 ring-2 ring-light-blue ring-opacity-50"
                  : "bg-blueGray-800"
              } ${step.isComplete ? "opacity-70" : "opacity-100"}`}
            >
              <header
                className={`flex items-center justify-between text-white`}
              >
                <h3
                  className={`font-semibold ${isCurrentStep ? "text-orange-400" : ""} ${step.isComplete && !isCurrentStep ? "line-through opacity-60" : ""}`}
                >
                  {idx + 1}. {step.title}
                </h3>
                <FontAwesomeIcon
                  icon={
                    isCurrentStep
                      ? faCircle
                      : step.isComplete
                        ? faCheckCircle
                        : faCircleDot
                  }
                  className={`h-3 w-3 text-xl ${isCurrentStep ? "animate-pulse text-orange" : step.isComplete ? "text-light-blue" : "rounded-full border-2 border-blueGray-500 text-transparent"}`}
                />
              </header>
              <div className="mt-2 text-gray-300">
                <p>{step.description}</p>
              </div>
              {isCurrentStep && (
                <div className="absolute inset-0 animate-pulse rounded-lg bg-light-blue bg-opacity-10"></div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <p className="p-4 text-gray-400">No plan steps available.</p>
    )}
  </div>
);

export default PlanComponent;
