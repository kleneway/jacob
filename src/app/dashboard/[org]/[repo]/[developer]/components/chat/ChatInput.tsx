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
import { Message, Role } from "@/types";
import { MAX_IMAGE_SIZE, MAX_IMAGES, ALLOWED_IMAGE_TYPES } from "@/constants";

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
  const [images, setImages] = useState<string[]>([]);
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
    const files = e.target.files;
    if (!files) return;

    if (files.length > MAX_IMAGES) {
      toast.error(`You can only upload up to ${MAX_IMAGES} images at a time.`);
      return;
    }

    const validFiles = Array.from(files).filter((file) => {
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name} is too large. Max size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`);
        return false;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a valid image type. Only ${ALLOWED_IMAGE_TYPES.join(", ")} are allowed.`);
        return false;
      }
      return true;
    });

    const uploadPromises = validFiles.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          try {
            const response = await fetch("/api/image/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: base64 }),
            });
            const data = await response.json();
            if (response.ok) {
              resolve(data.url);
            } else {
              reject(new Error(data.message || "Failed to upload image"));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.error("An unknown error occurred during upload");
      }
    }
  };

  const handleSend = () => {
    if (!content) {
      toast.error("Please enter a message");
      return;
    }
    const message = {
      role: Role.USER,
      content: content,
      images,
    };
    onSend(message);
    setContent("");
    setImages([]);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderUploadButton = () => (
    <button
      onClick={handleUploadClick}
      className="mr-2 h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
      disabled={isResponding}
      data-tooltip-id="tooltip_upload"
      data-tooltip-content="Upload images"
    >
      <FontAwesomeIcon icon={faUpload} />
    </button>
  );

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
            accept="image/*"
            multiple
            className="hidden"
          />
          {renderUploadButton()}
          <button
            onClick={handleSend}
            className="h-8 w-8 rounded-full border border-gray-400 bg-white text-black disabled:opacity-50"
            disabled={isResponding || !content}
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
      <Tooltip
        id="tooltip_upload"
        style={{
          backgroundColor: "#353535",
          color: "#EDEDED",
          marginTop: -2,
        }}
      />
    </div>
  );
};