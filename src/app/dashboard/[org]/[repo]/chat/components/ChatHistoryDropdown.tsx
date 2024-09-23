import React, { useState, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

interface ChatSession {
  id: string;
  timestamp: string;
  summary: string;
}

interface ChatHistoryDropdownProps {
  onSelectSession: (sessionId: string) => void;
}

const ChatHistoryDropdown: React.FC<ChatHistoryDropdownProps> = ({
  onSelectSession,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // TODO: Fetch chat sessions from the API
    // For now, we'll use mock data
    setSessions([
      {
        id: "1",
        timestamp: "2023-05-01 10:00",
        summary: "Discussion about React hooks",
      },
      {
        id: "2",
        timestamp: "2023-05-02 14:30",
        summary: "Debugging session for API integration",
      },
    ]);
  }, []);

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Chat History
          <ChevronDownIcon
            className="-mr-1 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </button>
      </div>
      {isOpen && (
        <div className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                <div className="font-medium">{session.summary}</div>
                <div className="text-xs text-gray-500">{session.timestamp}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistoryDropdown;
