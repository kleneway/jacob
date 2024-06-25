import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type FC } from "react";
import { type Message } from "~/types";
import { ChatInput } from "./ChatInput";
import { ChatLoader } from "./ChatLoader";
import { ChatMessage } from "./ChatMessage";

interface Props {
  messages: Message[];
  loading: boolean;
  uploadedImageUrls: string[];
  onSend: (message: Message) => void;
  onReset: () => void;
  onCreateNewTask: (messages: Message[]) => void;
  onUpdateIssue: (messages: Message[]) => void;
  isResponding?: boolean;
  shouldHideLogo?: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  sidebarRef: React.RefObject<HTMLDivElement>;
  checkIfAtBottom: () => void;
}

export const Chat: FC<Props> = ({
  messages,
  loading,
  uploadedImageUrls,
  onSend,
  onReset,
  onCreateNewTask,
  onUpdateIssue,
  isResponding,
  shouldHideLogo,
  messagesEndRef,
  sidebarRef,
  checkIfAtBottom,
}) => {
  return (
    <div
      ref={sidebarRef}
      className="hide-scrollbar flex h-full flex-col overflow-y-auto"
      onScroll={checkIfAtBottom}
    >
      <div className="flex-1 space-y-4 p-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message}
            messageHistory={messages.slice(0, index + 1)}
            onCreateNewTask={onCreateNewTask}
            onUpdateIssue={onUpdateIssue}
            loading={loading}
          />
        ))}
        {loading && <ChatLoader />}
        <div ref={messagesEndRef} />
      </div>
      <div className="sticky bottom-0 bg-gray-900 p-4">
        <ChatInput
          onSend={onSend}
          isResponding={isResponding}
          loading={loading}
        />
      </div>
    </div>
  );
};
