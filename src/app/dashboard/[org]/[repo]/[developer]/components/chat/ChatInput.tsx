import { faArrowUp, faUpload } from "@fortawesome/free-solid-svg-icons";
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

  const handleSend = () => {
    if (!content) {
      alert("Please enter a message");
      return;
    }
    onSend({ role: Role.USER, content });
    setContent("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isResponding || loading || isUploading) return;
      handleSend();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter((file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size must be under 20MB");
        return false;
      }
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        toast.error("File must be a PNG or JPEG image");
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("imageType", file.type);

        const response = await fetch("/api/image/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || "Image upload failed");
        }

        return result.url;
      });

      const urls = await Promise.all(uploadPromises);
      urls.forEach((url) => {
        onSend({ role: Role.USER, content: url });
      });
    } catch (error) {
      toast.error(error.message || "Image upload failed");
    } finally {
      setIsUploading(false);
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
        isResponding || loading || isUploading ? "opacity-50" : ""
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
          <button
            onClick={handleUploadClick}
            className="mr-2 h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
            disabled={isResponding || isUploading}
            data-tooltip-id="tooltip_chatinput_upload"
            data-tooltip-content="Upload image"
          >
            <FontAwesomeIcon icon={faUpload} />
          </button>
          <input
            type="file"
            multiple
            accept="image/png, image/jpeg"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={handleSend}
            className="h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
            disabled={isResponding || isUploading}
            data-tooltip-id="tooltip_chatinput_send"
            data-tooltip-content="Send message"
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
        </div>
      </div>
      <Tooltip
        id="tooltip_chatinput_upload"
        style={{
          backgroundColor: "#353535",
          color: "#EDEDED",
          marginTop: -2,
        }}
      />
      <Tooltip
        id="tooltip_chatinput_send"
        style={{
          backgroundColor: "#353535",
          color: "#EDEDED",
          marginTop: -2,
        }}
      />
    </div>
  );
};
