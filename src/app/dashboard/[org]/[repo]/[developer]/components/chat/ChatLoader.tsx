import { type FC, type CSSProperties } from "react";

interface ChatLoaderProps {
  type?: "chat" | "imageUpload" | "uploadButton";
  style?: CSSProperties;
}

export const ChatLoader: FC<ChatLoaderProps> = ({ type = "chat", style }) => {
  return (
    <div className="flex-start flex flex-col" style={style}>
      {type === "chat" ? (
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
      ) : type === "imageUpload" ? (
        <div className="flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-light-blue"></div>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-light-blue border-t-transparent"></div>
          <span className="text-xs text-light-blue">Uploading...</span>
        </div>
      )}
    </div>
  );
};

export const ImageUploadLoader: FC = () => (
  <ChatLoader
    type="imageUpload"
    style={{ height: "100%", width: "100%" }}
  />
);

export const UploadButtonLoader: FC = () => (
  <ChatLoader type="uploadButton" />
);