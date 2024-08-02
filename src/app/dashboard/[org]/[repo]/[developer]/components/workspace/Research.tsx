import React, { useState, useEffect } from 'react';
import { trpc } from '@/app/_trpc/client';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ResearchProps {
  issueId: string;
}

const Research: React.FC<ResearchProps> = ({ issueId }) => {
  const { data: researchItems, isLoading, error } = trpc.research.getByIssueId.useQuery({ issueId });

  if (isLoading) return <div className="p-4">Loading research items...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading research items</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Research</h2>
      {researchItems && researchItems.length > 0 ? (
        researchItems.map((item, index) => (
          <div key={index} className="mb-6">
            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div" {...props}>
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>{children}</code>
                  );
                }
              }}
            >{item.content}</ReactMarkdown>
          </div>
        ))
      ) : <p>No research items found.</p>}
    </div>
  );
};

export default Research;