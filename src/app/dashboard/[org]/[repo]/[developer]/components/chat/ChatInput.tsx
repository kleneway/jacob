import {
  faArrowUp,
  faUpload,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  type FC,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { Tooltip } from "react-tooltip";
import { type Message, Role } from "~/types";

interface Props {
  onSend: (message: Message) => void;
  isResponding?: boolean;
  loading?: boolean;
}

export const ChatInput: FC<Props> = ({
  onSend,
  isResponding = false,
  loading = false,
}) => {
  const [content, setContent] = useState<string>();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > 3000) {
      toast.error("Message limit is 3000 characters");
      return;
    }

    setContent(value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter((file) => file.size <= 20 * 1024 * 1024);

      if (validFiles.length !== files.length) {
        toast.error("Some files were larger than 20MB and were not included.");
      }

      setSelectedFiles(validFiles);
      await uploadFiles(validFiles);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append("image", file);

      try {
        const response = await fetch("/api/image/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        return data.url;
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean);
    setIsUploading(false);
    setContent((prev) => `${prev || ""} ${uploadedUrls.join(" ")}`);
  };

  const handleSend = () => {
    if (!content) {
      alert("Please enter a message");
      return;
    }
    onSend({ role: Role.USER, content });
    setContent("");
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isResponding || loading) return;
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef?.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div
      className={`flex w-full max-w-4xl flex-col items-start rounded-lg border border-gray-600 p-4 backdrop-blur-md ${
        isResponding || loading ? "opacity-50" : ""
      }`}
    >
      <textarea
        ref={textareaRef}
        className="w-full bg-transparent text-sm text-white text-opacity-80 placeholder-gray-400 outline-none"
        placeholder="Send a reply.."
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div className="items-between flex w-full flex-row">
        <p className="mt-2 text-base text-white text-opacity-40">
          {content?.length ?? 0}/3000
        </p>
        <div className="mt-2 flex w-full items-center justify-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            className={`mr-2 h-8 w-8 cursor-pointer rounded-full border border-gray-400 bg-white text-black ${isUploading ? "cursor-not-allowed opacity-50" : ""}`}
            data-tooltip-id="tooltip_chatinput"
            data-tooltip-content="Upload images"
            disabled={isUploading}
          >
            <div className="flex h-full w-full items-center justify-center">
              <FontAwesomeIcon
                icon={isUploading ? faSpinner : faUpload}
                spin={isUploading}
              />
            </div>
          </button>
          <button
            onClick={handleSend}
            className="h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
            disabled={isResponding}
            data-tooltip-id="tooltip_chatinput"
            data-tooltip-content="Send message"
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
        </div>
      </div>
      <Tooltip
        id="tooltip_chatinput"
        style={{
          backgroundColor: "#353535",
          color: "#EDEDED",
          marginTop: -2,
        }}
      />
    </div>
  );
};
