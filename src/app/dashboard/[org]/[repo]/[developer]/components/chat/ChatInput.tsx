import { faArrowUp, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  type FC,
  type KeyboardEvent,
  useEffect,
  useRef,
  useCallback,
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
  const [isUploading, setIsUploading] = useState(false);
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
      if (isResponding || loading) return;
      handleSend();
    }
  };

  const handleUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 20MB limit`);
        return false;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error(`${file.name} is not a valid image file (PNG or JPEG only)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const reader = new FileReader();
        const imageDataPromise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
        });
        reader.readAsDataURL(file);
        const imageData = await imageDataPromise;

        const response = await fetch('/api/image/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageData.split(',')[1],
            imageType: file.type,
            imageName: file.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const { url } = await response.json();
        return url;
      });

      const urls = await Promise.all(uploadPromises);
      setContent((prev) => (prev ? `${prev}\n${urls.join('\n')}` : urls.join('\n')));
      toast.success('Images uploaded successfully');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.error('Failed to upload one or more images');
      }
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
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
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png,image/jpeg"
            multiple
            onChange={(e) => handleUpload(e.target.files!)}
          />
          <button
            onClick={triggerFileInput}
            className="mr-2 h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
            disabled={isResponding || loading || isUploading}
            data-tooltip-id="tooltip_chatinput_upload"
            data-tooltip-content="Upload images"
          >
            <FontAwesomeIcon icon={faUpload} className={isUploading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleSend}
            className="h-8 w-8 rounded-full border border-gray-400 bg-white text-black"
            disabled={isResponding || loading || isUploading}
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