import React from "react";

const DesignSystemOverview: React.FC = () => {
  return (
    <div className="mb-4 rounded-md bg-white/50 p-4 shadow-sm transition-colors dark:bg-slate-800/50">
      <h2 className="mb-4 text-xl font-bold text-aurora-700 transition-colors dark:text-aurora-300 sm:text-2xl">
        Design System Overview
      </h2>
      <div className="space-y-4">
        <section>
          <h3 className="text-lg font-semibold text-gray-900 transition-colors dark:text-white sm:text-xl">
            Color System
          </h3>
          <p className="mt-1 text-sm text-gray-600 transition-colors dark:text-gray-300">
            This application uses a robust color system defined in the Tailwind
            configuration, including brand colors like Aurora &amp; Blossom, as
            well as semantic colors.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-semibold text-gray-900 transition-colors dark:text-white sm:text-xl">
            Typography
          </h3>
          <p className="mt-1 text-sm text-gray-600 transition-colors dark:text-gray-300">
            Multiple font families such as Inter, Lexend, and Crimson Text are
            used to create a clear hierarchy and consistent appearance across
            the application.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-semibold text-gray-900 transition-colors dark:text-white sm:text-xl">
            Common UI Elements
          </h3>
          <p className="mt-1 text-sm text-gray-600 transition-colors dark:text-gray-300">
            Button, Data Table, Dropdown Menu, and other core interactive
            components are built using reusable design tokens and consistent
            styling patterns.
          </p>
        </section>
      </div>
    </div>
  );
};

export default DesignSystemOverview;
