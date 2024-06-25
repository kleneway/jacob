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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showUploadedImages, setShowUploadedImages] = useState(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const newUploadedImages: string[] = [];

    for (const file of files) {
      if (!file) {
        console.error("File is undefined");
        continue;
      }

      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast.error(`${file.name} is not a valid image type. Please upload PNG or JPEG files.`);
        continue;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 20MB size limit.`);
        continue;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result as string;

        try {
          const response = await fetch("/api/image/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: base64Image,
              name: file.name,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          newUploadedImages.push(data.url);
          setUploadedImages((prev) => [...prev, data.url]);
          setShowUploadedImages(true);
        } catch (error) {
          if (error instanceof Error) {
            console.error("Error uploading file:", error.message);
            toast.error(`Failed to upload ${file.name}: ${error.message}`);
          } else {
            console.error("Unknown error uploading file:", error);
          }
          toast.error(`Failed to upload ${file.name}`);
        }
      };
    }
    setUploadedImages((prev) => [...prev, ...newUploadedImages]);
    setShowUploadedImages(true);
    setIsUploading(false);
    e.target.value = '';
  };

  const handleSend = () => {
    if (!content) {
      alert("Please enter a message");
      return;
    }
    const messageContent = uploadedImages.length > 0
      ? `${content}\n\nUploaded images:\n${uploadedImages.join('\n')}`
      : content;
    onSend({ role: Role.USER, content: messageContent });
    setContent('');
    setUploadedImages([]);
    setShowUploadedImages(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderUploadButton = () => (
    <button
      onClick={handleUploadClick}
      className="mr-2 h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
      disabled={isUploading || isResponding}
      data-tooltip-id="tooltip_upload"
      data-tooltip-content="Upload images"
    >
      <FontAwesomeIcon icon={faUpload} className={isUploading ? "animate-spin" : ""} />
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
            onChange={handleImageUpload}
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
          />
          {renderUploadButton()}
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