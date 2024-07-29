import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ResearchItem {
  question: string;
  answer: string;
}

interface ResearchProps {
  taskId: string;
}

const Research: React.FC<ResearchProps> = ({ taskId }) => {
  const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);

  useEffect(() => {
    const fetchResearchItems = async () => {
      // Simulated API call
      const response = await fetch(`/api/research?taskId=${taskId}`);
      const data = await response.json();
      setResearchItems(data);
    };

    fetchResearchItems();
  }, [taskId]);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Research</h2>
      {researchItems.map((item, index) => (
        <div key={index} className="bg-white shadow rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">{item.question}</h3>
          <div className="prose max-w-none">
            <ReactMarkdown>
              {item.answer}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Research;