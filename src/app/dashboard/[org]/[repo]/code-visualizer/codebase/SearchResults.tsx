import React from "react";
import { motion } from "framer-motion";
import { type ContextItem } from "~/server/utils/codebaseContext";

interface SearchResultsProps {
  results: ContextItem[];
  onSelect: (filePath: string) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, onSelect }) => {
  return (
    <div className="search-results-container">
      {results.length > 0 ? (
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="search-results-list"
        >
          {results.slice(0, 10).map((result, index) => (
            <motion.li
              key={index}
              className="search-result-item cursor-pointer p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(result.filePath)}
            >
              <div className="file-path text-sm text-gray-800 dark:text-gray-200">
                {result.filePath}
              </div>
              <div className="file-overview text-xs text-gray-600 dark:text-gray-400">
                {result.overview}
              </div>
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <div className="no-results text-center text-gray-500 dark:text-gray-400">
          No matching files found.
        </div>
      )}
    </div>
  );
};

export default SearchResults;