import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { api } from '@/utils/api';

interface ResearchItem {
  id: string;
  question: string;
  answer: string;
}

const Research: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { data: researchItems, isLoading, error } = useQuery<ResearchItem[]>(
    ['researchItems', taskId],
    () => api.events.getResearchItems.query({ taskId }),
    { enabled: !!taskId }
  );

  if (isLoading) return <div className="p-4">Loading research items...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading research items</div>;
  if (!researchItems || researchItems.length === 0) return <div className="p-4">No research items found</div>;

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold mb-4">Research</h2>
      {researchItems.map((item) => (
        <div key={item.id} className="bg-white shadow rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">{item.question}</h3>
          <div className="prose max-w-none">
            <ReactMarkdown>{item.answer}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Research;