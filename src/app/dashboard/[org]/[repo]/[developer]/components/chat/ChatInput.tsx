import { faArrowUp, faPaperclip } from "@fortawesome/free-solid-svg-icons";
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
  const [content, setContent] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);

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
      if (isResponding || loading || uploading) return;
      handleSend();
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter(
      (file) => file.type === "image/jpeg" || file.type === "image/png",
    );
    const invalidFiles = Array.from(files).length !== validFiles.length;

    if (invalidFiles) {
      toast.error("Only JPEG and PNG images are allowed");
      return;
    }

    const oversizedFiles = validFiles.filter(
      (file) => file.size > 20 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast.error("Images must be under 20MB");
      return;
    }

    setUploading(true);
    // Example upload logic, replace with actual upload code
    Promise.all(
      validFiles.map(async (file) => {
        // Upload logic here
        const formData = new FormData();
        formData.append("image", file);
        // Assuming API endpoint '/api/image/upload' accepts form data
        try {
          const response = await fetch("/api/image/upload", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (data.success) {
            // Handle successful upload, e.g., append image URL to chat content or state
            toast.success(`Image uploaded: ${data.url}`);
          } else {
            throw new Error(data.message);
          }
        } catch (error) {
          toast.error(`Upload failed: ${error}`);
        }
      }),
    ).then(() => {
      setUploading(false);
    });
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
        isResponding || loading || uploading ? "opacity-50" : ""
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
        <div className="mt-2 flex w-full items-center justify-end space-x-2">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={handleFileUpload}
            id="image-upload"
            className="hidden"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <FontAwesomeIcon icon={faPaperclip} className="text-white" />
          </label>
          <button
            onClick={handleSend}
            className="h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
            disabled={isResponding || uploading}
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
