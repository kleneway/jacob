import React, { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { ResearchItem } from '@/types';
import ReactMarkdown from 'react-markdown';

interface ResearchProps {
  taskId: string;
}

const Research: React.FC<ResearchProps> = ({ taskId }) => {
  const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);

  const { data: fetchedResearchItems, isLoading, error } = api.events.getResearchItems.useQuery({ taskId });

  useEffect(() => {
    if (fetchedResearchItems) {
      setResearchItems(fetchedResearchItems);
    }
  }, [fetchedResearchItems]);

  if (isLoading) return <div className="text-center">Loading research items...</div>;
  if (error) return <div className="text-center text-red-500">Error loading research items</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Research</h2>
      {researchItems.length === 0 ? (
        <p>No research items found for this task.</p>
      ) : (
        researchItems.map((item, index) => (
          <div key={index} className="bg-white shadow rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">{item.question}</h3>
            <div className="prose max-w-none">
              <ReactMarkdown>{item.answer}</ReactMarkdown>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Research;