import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ResearchItem {
  id: string;
  question: string;
  answer: string;
}

interface ResearchProps {
  researchItems: ResearchItem[];
}

const Research: React.FC<ResearchProps> = ({ researchItems }) => {
  return (
    <div className="space-y-6">
      {researchItems.map((item) => (
        <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">{item.question}</h3>
          <ReactMarkdown
            className="prose max-w-none"
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>{children}</code>
                );
              },
            }}>{item.answer}</ReactMarkdown>
        </div>
      ))}
    </div>
  );
};

export default Research;