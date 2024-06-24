import { type FC } from "react";

export const ChatLoader: FC = () => {
  return (
    <div className="flex-start flex flex-col">
      <div
        className={`flex w-fit items-center rounded-2xl bg-blueGray-700/80 px-4 py-2 text-neutral-900`}
        style={{ overflowWrap: "anywhere" }}
      >
        <div className="flex flex-row items-center justify-center space-x-1">
          <div className="h-2 w-2 animate-bounce-fast rounded-full bg-light-blue [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce-fast rounded-full bg-pink  [animation-delay:-0.8s]"></div>
          <div className="h-2 w-2 animate-bounce-fast rounded-full bg-orange"></div>
        </div>
      </div>
    </div>
  );
};

// ChatInput.tsx
import { type FC } from "react";
import { useTranslation } from "react-i18next";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder: string;
}

export const ChatInput: FC<ChatInputProps> = ({ onSend, disabled, placeholder }) => {
  const { t } = useTranslation("chat");

  return (
    <div className="relative flex items-center">
      <textarea
        className="w-full resize-none rounded-lg border border-neutral-300 bg-transparent px-4 py-2 pr-12 text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-600"
        style={{ maxHeight: "200px", height: "52px", overflowY: "hidden" }}
        placeholder={disabled ? t("Thinking...") : placeholder}
        value=""
        rows={1}
        onKeyDown={() => {}}
        onChange={() => {}}
        disabled={disabled}
      />
      <button
        className="absolute right-2 rounded-lg p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
        onClick={() => onSend("")}
        disabled={disabled}
      >
        <IconSend size={18} />
      </button>
    </div>
  );
};
55|