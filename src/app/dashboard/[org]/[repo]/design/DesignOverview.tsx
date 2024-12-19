import React, { useEffect, useState } from "react";

interface DesignOverviewProps {
  org: string;
  repo: string;
}

const DesignOverview: React.FC<DesignOverviewProps> = ({ org, repo }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/design/overview");
        if (!res.ok) {
          throw new Error("Failed to fetch design overview");
        }
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [org, repo]);

  if (!data) {
    return <div>Loading design overview...</div>;
  }

  return (
    <div className="mb-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 transition-colors dark:text-white">
        Design System Overview
      </h3>

      <div>
        <h4 className="text-md font-semibold text-gray-800 transition-colors dark:text-gray-200">
          Colors
        </h4>
        <ul className="list-disc pl-5 text-sm text-gray-600 transition-colors dark:text-gray-300">
          {Array.isArray(data.colors) &&
            data.colors.map((color: string) => <li key={color}>{color}</li>)}
        </ul>
      </div>

      <div>
        <h4 className="text-md font-semibold text-gray-800 transition-colors dark:text-gray-200">
          Typography
        </h4>
        <p className="text-sm text-gray-600 transition-colors dark:text-gray-300">
          Fonts:{" "}
          {Array.isArray(data.typography?.fonts)
            ? data.typography.fonts.join(", ")
            : ""}
        </p>
      </div>

      <div>
        <h4 className="text-md font-semibold text-gray-800 transition-colors dark:text-gray-200">
          Common UI Elements
        </h4>
        <ul className="list-disc pl-5 text-sm text-gray-600 transition-colors dark:text-gray-300">
          {Array.isArray(data.uiElements) &&
            data.uiElements.map((element: string) => (
              <li key={element}>{element}</li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default DesignOverview;
