import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

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
    <div className="space-y-4 p-4">
      <h2 className="mb-4 text-2xl font-bold">Research</h2>
      {researchItems.map((item, index) => (
        <div key={index} className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 text-lg font-semibold">{item.question}</h3>
          <div className="prose max-w-none">
            <ReactMarkdown>{item.answer}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Research;
