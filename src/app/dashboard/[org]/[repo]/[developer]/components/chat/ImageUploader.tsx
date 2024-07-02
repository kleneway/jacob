--- src/app/dashboard/[org]/[repo]/[developer]/components/chat/ImageUploader.tsx
+++ src/app/dashboard/[org]/[repo]/[developer]/components/chat/ImageUploader.tsx
@@ -0,0 +1,86 @@
+import React, { useState, useRef } from 'react';
+import { toast } from 'react-toastify';
+
+interface ImageUploaderProps {
+  onUploadComplete: (urls: string[]) => void;
+}
+
+export const ImageUploader: React.FC<ImageUploaderProps> = ({ onUploadComplete }) => {
+  const [loading, setLoading] = useState(false);
+  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
+  const fileInputRef = useRef<HTMLInputElement>(null);
+
+  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
+    const files = event.target.files;
+    if (!files) return;
+
+    const validFiles: File[] = [];
+    for (let i = 0; i < files.length; i++) {
+      const file = files[i];
+      if (file.size > 20 * 1024 * 1024) {
+        toast.error(`${file.name} exceeds 20MB limit`);
+        continue;
+      }
+      if (!['image/jpeg', 'image/png'].includes(file.type)) {
+        toast.error(`${file.name} is not a PNG or JPEG file`);
+        continue;
+      }
+      validFiles.push(file);
+    }
+
+    if (validFiles.length === 0) return;
+
+    setLoading(true);
+    const newUrls: string[] = [];
+
+    try {
+      for (const file of validFiles) {
+        const base64 = await fileToBase64(file);
+        const response = await fetch('/api/image/upload', {
+          method: 'POST',
+          headers: { 'Content-Type': 'application/json' },
+          body: JSON.stringify({
+            image: base64,
+            imageType: file.type,
+            imageName: file.name,
+          }),
+        });
+
+        if (!response.ok) throw new Error('Upload failed');
+
+        const { url } = await response.json();
+        newUrls.push(url);
+      }
+
+      setUploadedUrls((prev) => [...prev, ...newUrls]);
+      onUploadComplete(newUrls);
+      toast.success('Images uploaded successfully');
+    } catch (error) {
+      toast.error('Failed to upload images');
+    } finally {
+      setLoading(false);
+    }
+  };
+
+  const fileToBase64 = (file: File): Promise<string> => {
+    return new Promise((resolve, reject) => {
+      const reader = new FileReader();
+      reader.readAsDataURL(file);
+      reader.onload = () => resolve(reader.result as string);
+      reader.onerror = (error) => reject(error);
+    });
+  };
+
+  return (
+    <div>
+      <input
+        type="file"
+        ref={fileInputRef}
+        onChange={handleFileSelect}
+        multiple
+        accept="image/jpeg,image/png"
+        style={{ display: 'none' }}
+      />
+      <button onClick={() => fileInputRef.current?.click()} disabled={loading}>
+        {loading ? 'Uploading...' : 'Upload Images'}
+      </button>
+    </div>
+  );
+};