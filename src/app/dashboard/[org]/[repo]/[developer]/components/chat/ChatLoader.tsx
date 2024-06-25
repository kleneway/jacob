import { type FC, type HTMLAttributes } from "react";

interface ChatLoaderProps extends HTMLAttributes<HTMLDivElement> {
  size?: "small" | "large";
}

export const ChatLoader: FC<ChatLoaderProps> = ({ size = "large", className, ...props }) => {
  return (
    <div className={`flex-start flex flex-col ${className}`} {...props}>
      <div
        className={`flex w-fit items-center ${
          size === "large" ? "rounded-2xl bg-blueGray-700/80 px-4 py-2" : ""
        } text-neutral-900`}
        style={{ overflowWrap: "anywhere" }}
      >
        <div className="flex flex-row items-center justify-center space-x-1">
          <div
            className={`${
              size === "large" ? "h-2 w-2" : "h-1 w-1"
            } animate-bounce-fast rounded-full bg-light-blue [animation-delay:-0.15s]`}
          ></div>
          <div
            className={`${size === "large" ? "h-2 w-2" : "h-1 w-1"} animate-bounce-fast rounded-full bg-pink [animation-delay:-0.8s]`}
          ></div>
          <div className={`${size === "large" ? "h-2 w-2" : "h-1 w-1"} animate-bounce-fast rounded-full bg-orange`}></div>
        </div>
      </div>
    </div>
  );
};
