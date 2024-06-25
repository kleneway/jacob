import { faArrowUp, faUpload, faImage } from "@fortawesome/free-solid-svg-icons";
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
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showUploadedImages, setShowUploadedImages] = useState<boolean>(false);
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
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);

    const uploadPromises = Array.from(files).map(async (file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return null;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 20MB size limit`);
        return null;
      }

      const formData = new FormData();
      formData.append("image", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const result = await response.json();
        return result.url;
      } catch (error) {
        console.error("Error uploading image:", error);
        if (error instanceof Error) {
          toast.error(`Error uploading ${file.name}: ${error.message}`);
        }
        return null;
      }
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);
      setUploadedImages((prevUrls) => [...prevUrls, ...validUrls]);
    } catch (error) {
      console.error("Error processing uploads:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = () => {
    if (!content && uploadedImages.length === 0) {
      toast.error("Please enter a message or upload an image");
      return;
    }

    let messageContent = content || "";

    if (uploadedImages.length > 0) {
      messageContent += "\n\nUploaded images:\n" + uploadedImages.join("\n");
    }

    onSend({ role: Role.USER, content: messageContent });
    setContent("");
    setUploadedImages([]);
    setShowUploadedImages(false);
  };

  const toggleUploadedImages = () => {
    setShowUploadedImages(!showUploadedImages);
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
        {uploadedImages.length > 0 && (
          <div className="mt-2 flex items-center">
            <button
              onClick={toggleUploadedImages}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              <FontAwesomeIcon icon={faImage} className="mr-1" />
              {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} uploaded
            </button>
          </div>
        )}
        {showUploadedImages && (
          <div className="mt-2 flex flex-wrap gap-2">
            {uploadedImages.map((url, index) => (
              <img key={index} src={url} alt={`Uploaded ${index + 1}`} className="h-16 w-16 object-cover rounded" />
            ))}
          </div>
        )}
        <div className="mt-2 flex w-full items-center justify-end">
          {uploadedImages.length > 0 && <p className="mr-2 text-sm text-gray-400">{uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} ready</p>}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/png,image/jpeg,image/jpg"
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