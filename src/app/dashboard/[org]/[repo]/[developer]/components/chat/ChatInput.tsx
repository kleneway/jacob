import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faUpload } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { type Message, Role } from "~/types";

interface Props {
  onSend: (message: Message) => void;
  isResponding: boolean | undefined;
  loading: boolean | undefined;
}

const ChatInput: React.FC<Props> = ({ onSend, isResponding, loading }) => {
  const [input, setInput] = useState("");
  const [imageLoading, setImageLoading] = useState(false);

  const handleSend = () => {
    if (input.trim() === "") return;
    onSend({ role: Role.USER, content: input });
    setInput("");
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const validImages = Array.from(files).filter((file) => {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        toast.error("Only JPEG and PNG images are allowed.");
        return false;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Image size must be under 20MB.");
        return false;
      }
      return true;
    });

    if (validImages.length === 0) return;

    setImageLoading(true);
    try {
      const uploadPromises = validImages.map(async (file) => {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("imageType", file.type);

        const response = await fetch("/api/image/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || "Image upload failed");
        }

        return data.url;
      });

      const imageUrls = await Promise.all(uploadPromises);
      imageUrls.forEach((url) => {
        onSend({ role: Role.USER, content: url });
      });
      toast.success("Images uploaded successfully.");
    } catch (error) {
      toast.error(error.message || "Image upload failed.");
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-4xl flex-col items-start rounded-lg border border-gray-600 p-4 backdrop-blur-md">
      <div className="flex w-full items-center space-x-2">
        <button
          className={`flex items-center justify-center rounded bg-blue-500 p-2 text-white transition ${
            imageLoading ? "cursor-wait opacity-50" : ""
          }`}
          disabled={imageLoading}
        >
          <FontAwesomeIcon icon={faUpload} />
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded border border-gray-300 p-2"
          placeholder="Type your message..."
          disabled={loading || isResponding}
        />
        <button
          onClick={handleSend}
          className={`flex items-center justify-center rounded bg-blue-500 p-2 text-white transition ${
            loading ? "cursor-wait opacity-50" : ""
          }`}
          disabled={loading}
        >
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
