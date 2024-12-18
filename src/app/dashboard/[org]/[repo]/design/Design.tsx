import React from "react";
import DesignSystemOverview from "./DesignSystemOverview";
import FigmaPluginContent from "./FigmaPluginContent";

interface DesignProps {
  org: string;
  repo: string;
}

const DesignComponent: React.FC<DesignProps> = ({ org, repo }) => {
  return (
    <div className="hide-scrollbar mx-auto flex h-full w-full max-w-4xl flex-col space-y-4 overflow-hidden px-4 md:flex-row md:space-x-4 md:space-y-0 md:px-0">
      <div className="hide-scrollbar h-full flex-1 space-y-4 overflow-y-auto">
        <DesignSystemOverview />
        <FigmaPluginContent org={org} repo={repo} />
      </div>
    </div>
  );
};

export default DesignComponent;
