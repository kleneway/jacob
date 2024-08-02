import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ResearchItem {
  question: string;
  answer: string;
}

interface ResearchProps {
  researchItems: ResearchItem[];
}

const Research: React.FC<ResearchProps> = ({ researchItems }) => {
  return (
    <div className="space-y-6">
      {researchItems.map((item, index) => (
        <div
          key={index}
          className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800"
        >
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
            {item.question}
          </h3>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={atomDark}
                      language={match[1]}
                      {...props}
                      PreTag="div"
                      {...(inline ? { inline: true } : {})}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {item.answer}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Research;
