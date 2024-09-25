// components/SearchBar.tsx
import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { api } from "~/trpc/react";
import { type ContextItem } from "~/server/utils/codebaseContext";

interface SearchBarProps {
  org: string;
  repo: string;
  onSearch: (results: ContextItem[]) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ org, repo, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const searchCodebase = api.codebaseContext.searchCodebase.useQuery();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const results = await searchCodebase.refetch({ org, repo, query: searchTerm });
    setIsLoading(false);
    if (results.data) {
      onSearch(results.data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <motion.input
        className="rounded-l-lg bg-blueGray-700 px-4 py-2 text-gray-300 focus:outline-none focus:ring-2 focus:ring-light-blue w-64"
        value={searchTerm}
        disabled={isLoading}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search files..."
        className="rounded-l-lg bg-blueGray-700 px-4 py-2 text-gray-300 focus:outline-none focus:ring-2 focus:ring-light-blue"
        className={`rounded-r-lg px-4 py-2 text-white ${isLoading ? 'bg-gray-500' : 'bg-light-blue'}`}
      />
      <motion.button
        disabled={isLoading}
        type="submit"
        {isLoading ? 'Searching...' : <FontAwesomeIcon icon={faSearch} />}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FontAwesomeIcon icon={faSearch} />
      </motion.button>
    </form>
  );
};

export default SearchBar;
