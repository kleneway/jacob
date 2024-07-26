"use client";

import React from "react";
import { type RouterOutputs } from "~/trpc/shared";
import { api } from "~/trpc/react";
import Markdown from "react-markdown";
import gfm from "remark-gfm";

interface ResearchProps {
  taskId: number;
}

type ResearchItem = {
  id: number;
  question: string;
  answer: string;
};

const Research: React.FC<ResearchProps> = ({ taskId }) => {
  const { data: researchItems } = api.research.getAll.useQuery<ResearchItem[]>({
    taskId,
  });

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-white">Research</h2>
      <hr className="my-2 border-t border-gray-700" />
      <ul>
        {researchItems?.map((item) => (
          <li key={item.id} className="mb-4">
            <p className="font-medium text-gray-300">{item.question}</p>
            <div className="mt-2 text-gray-400">
              <Markdown remarkPlugins={[gfm]}>{item.answer}</Markdown>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Research;


