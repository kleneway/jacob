import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type FC, useEffect, useState } from "react";
import { type Message } from "~/types";
import { ChatInput } from "./ChatInput";
import { ChatLoader } from "./ChatLoader";
import { ChatMessage } from "./ChatMessage";

interface Props {
  messages: Message[];
  loading: boolean;
  onSend: (message: Message) => void;
  onReset: () => void;
  onCreateNewTask: (messages: Message[]) => void;
  onUpdateIssue: (messages: Message[]) => void;
  isResponding?: boolean;
  shouldHideLogo?: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  sidebarRef: React.RefObject<HTMLDivElement>;
  checkIfAtBottom: () => void;
  scrollToBottom: () => void;
  isAtBottom: boolean;
}

export const Chat: FC<Props> = ({
  messages,
  loading,
  onSend,
  onCreateNewTask,
  onUpdateIssue,
  isResponding = false,
  messagesEndRef,
  sidebarRef,
  checkIfAtBottom,
  scrollToBottom,
  isAtBottom,
}) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const handleSend = async (message: Message) => {
    const messageWithImages = { ...message, imageUrls };
    await onSend(messageWithImages);
    setImageUrls([]);
  };

  useEffect(() => {
    if (imageUrls.length > 0) {
      const newMessage: Message = { role: "user", content: "", imageUrls };
      onSend(newMessage);
    }
  }, [imageUrls]);

  return (
    <div
      className="space-between flex flex-col rounded-lg px-2 pb-8 sm:p-4"
      style={{ height: "calc(100vh - 6rem)" }}
    >
      <div
        className="hide-scrollbar flex flex-1 flex-col overflow-y-auto"
        ref={sidebarRef}
        onScroll={checkIfAtBottom}
      >
        {messages.map((message, index) => (
          <div key={index} className="my-1 sm:my-2">
            <ChatMessage
              messageHistory={messages}
              message={message}
              onCreateNewTask={onCreateNewTask}
              onUpdateIssue={onUpdateIssue}
              loading={loading}
            />
          </div>
        ))}

        {loading && (
          <div className="my-1 sm:my-1.5">
            <ChatLoader />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative left-0 mt-3 w-full sm:mt-6">
        <ChatInput
          onSend={handleSend}
          isResponding={isResponding}
          loading={loading}
          setImageUrls={setImageUrls}
        />
        {!isAtBottom && (
          <div
            className="absolute left-1/2 top-0 -my-14 flex h-10 w-10 -translate-x-1/2 transform cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white bg-opacity-80  transition duration-300 ease-in-out hover:bg-opacity-100"
            onClick={scrollToBottom}
          >
            <FontAwesomeIcon icon={faArrowDown} size="2x" />
          </div>
        )}
      </div>
    </div>
  );
};
