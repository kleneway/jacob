import { type FC, useState, useEffect } from "react";
import { Role, type Message, SpecialPhrases } from "~/types";
import Markdown, { type Components } from "react-markdown";
import gfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { faArrowRight, faClipboard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "react-toastify";

interface Props {
  message: Message;
  messageHistory: Message[];
  onCreateNewTask: (messages: Message[]) => void;
  onUpdateIssue: (messages: Message[]) => void;
  loading?: boolean;
  uploadedImages?: string[];
}

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-redundant-type-constituents
export const renderers: Partial<Components | any> = {
  code: ({
    inline,
    className,
    children,
    ...props
  }: {
    inline: boolean;
    className: string;
    children: React.ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || "");
    if (!inline && match) {
      return (
        <div className="relative">
          <button
            className="absolute right-2 top-0 rounded bg-gray-800 p-1 text-white"
            onClick={() => copyToClipboard(String(children))}
          >
            <FontAwesomeIcon icon={faClipboard} />
          </button>
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      );
    } else if (inline) {
      // Render inline code with `<code>` instead of `<div>`
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    } else {
      // Fallback for non-highlighted code
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  },
};

export const ChatMessage: FC<Props> = ({
  message,
  messageHistory,
  onCreateNewTask,
  onUpdateIssue,
  loading = false,
  uploadedImages = [],
}) => {
  const [content, setContent] = useState<string>(message.content);

  useEffect(() => {
    if (
      message.role === Role.ASSISTANT &&
      message.content.includes(SpecialPhrases.CREATE_TASK)
    ) {
      setContent(message.content.replace(SpecialPhrases.CREATE_TASK, ""));
    } else if (
      message.role === Role.ASSISTANT &&
      message.content.includes(SpecialPhrases.UPDATE_TASK)
    ) {
      setContent(message.content.replace(SpecialPhrases.UPDATE_TASK, ""));
    } else {
      setContent(message.content);
    }
  }, [message.content, message.role]);

  return (
    <div
      className={`flex flex-col ${message.role === Role.ASSISTANT ? "items-start" : "items-end"}`}
    >
      {content?.length > 0 && (
        <div
          className={`markdown-chat flex flex-col text-left font-figtree ${message.role === Role.ASSISTANT ? "max-w-[100%]" : "max-w-[95%] bg-gradient-to-l from-blueGray-700/50 to-blueGray-800/50"} hide-scrollbar rounded-md px-2  shadow-md`}
          style={{ overflowWrap: "anywhere" }}
        >
          <Markdown
            remarkPlugins={[gfm]}
            className={`px-1 py-1`}
            components={renderers}
          >
            {content}
          </Markdown>
          {message.role === Role.USER && uploadedImages.length > 0 && (
            <div className="mt-2 flex flex-wrap">
              {uploadedImages.map((url, index) => (
                <img key={index} src={url} alt={`Uploaded ${index + 1}`} className="m-1 h-16 w-16 rounded object-cover" />
              ))}
            </div>
          )}
        </div>
      )}
      {message.role === Role.ASSISTANT &&
        message.content.includes(SpecialPhrases.CREATE_TASK) && (
          <div className="mt-2 flex justify-center self-center">
            <div
              className={`inline-flex  items-center justify-center gap-2 rounded border border-gray-400 bg-white px-6 py-2 ${loading ? "cursor-wait opacity-50 " : "cursor-pointer "}`}
              onClick={() => onCreateNewTask(messageHistory)}
            >
              <div className="text-center text-xs font-medium text-black">
                {loading ? "Creating Issue..." : "Create New Issue"}
              </div>
              <div className="relative text-black">
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
            </div>
          </div>
        )}

      {message.role === Role.ASSISTANT &&
        message.content.includes(SpecialPhrases.UPDATE_TASK) && (
          <div className="mt-2 flex justify-center self-center">
            <div
              className={`inline-flex items-center justify-center gap-2 rounded border border-gray-400 bg-white px-6 py-2 ${loading ? "cursor-wait opacity-50 " : "cursor-pointer "}`}
              onClick={() => onUpdateIssue(messageHistory)}
            >
              <div className="text-center text-xs font-medium text-black">
                {loading ? "Updating Issue..." : "Update GitHub Issue"}
              </div>
              <div className="relative text-black">
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
