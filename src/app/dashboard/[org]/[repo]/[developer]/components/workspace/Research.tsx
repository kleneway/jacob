import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface ResearchItem {
  id: string;
  question: string;
  answer: string;
}

interface ResearchProps {
  issueId: string;
}

const Research: React.FC<ResearchProps> = ({ issueId }) => {
  const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);

  useEffect(() => {
    const fetchResearchItems = async () => {
      try {
        const response = await fetch(`/api/research?issueId=${issueId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch research items");
        }
        const data = await response.json();
        setResearchItems(data);
      } catch (error) {
        console.error("Error fetching research items:", error);
      }
    };

    fetchResearchItems();
  }, [issueId]);

  return (
    <div className="space-y-4">
      {researchItems.map((item) => (
        <div key={item.id} className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 text-lg font-semibold">{item.question}</h3>
          <div className="prose prose-sm">
            <ReactMarkdown>{item.answer}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Research;
