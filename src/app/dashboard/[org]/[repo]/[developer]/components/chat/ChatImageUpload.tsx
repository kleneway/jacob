import React, { useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload } from "@fortawesome/free-solid-svg-icons";

const ChatImageUpload: React.FC<{ setImageUrls: (urls: string[]) => void }> = ({
  setImageUrls,
}) => {
  const [loading, setLoading] = useState(false);

  const handleUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg";
    input.multiple = true;
    input.onchange = handleFileChange;
    input.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 20MB limit.`);
        continue;
      }
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        toast.error(`${file.name} is not a valid image type.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      await uploadImages(validFiles);
    }
  };

  const uploadImages = async (files: File[]) => {
    setLoading(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map(async (file) => {
          const formData = new FormData();
          formData.append("image", file);
          const response = await fetch("/api/image/upload", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Upload failed");
          }
          return data.url;
        }),
      );
      setImageUrls((prevUrls) => [...prevUrls, ...urls]);
      toast.success("Images uploaded successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="upload-button"
      onClick={handleUploadClick}
      disabled={loading}
    >
      <FontAwesomeIcon icon={faUpload} />
    </button>
  );
};

export default ChatImageUpload;
