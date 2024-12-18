import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import DesignSystemOverview from "./DesignSystemOverview";
import FigmaPluginContent from "./FigmaPluginContent";

interface DesignProps {
  org: string;
  repo: string;
}

const DesignComponent: React.FC<DesignProps> = ({ org, repo }) => {
  return (
    <div className="hide-scrollbar mx-auto flex h-full w-full max-w-4xl flex-col space-y-4 overflow-hidden px-4 md:flex-row md:space-x-4 md:space-y-0 md:px-0">
      <div className="hide-scrollbar h-full flex-1 overflow-y-auto">
        <div className="rounded-md bg-white/50 p-4 shadow-sm transition-colors dark:bg-slate-800/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-aurora-700 transition-colors dark:text-aurora-300 sm:text-2xl">
              Design
            </h2>
          </div>
          <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <DesignSystemOverview />
            <FigmaPluginContent org={org} repo={repo} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignComponent;
