"use client";

import { useState, useRef, type DragEvent } from "react";

interface ImageUploadProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  maxSizeBytes?: number;
  accept?: string;
  hint?: string;
}

export function ImageUpload({
  label,
  value,
  onChange,
  maxSizeBytes = 1024 * 1024, // 1MB default
  accept = "image/png,image/svg+xml,image/webp,image/jpeg",
  hint,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    if (file.size > maxSizeBytes) {
      const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
      setError(`File size exceeds limit (${maxMb} MB).`);
      return;
    }

    setUploading(true);
    try {
      const signRes = await fetch("/api/admin/upload/sign", { method: "POST" });
      if (!signRes.ok) {
        throw new Error("Failed to get upload signature");
      }
      const signData = await signRes.json() as {
        uploadUrl: string;
        apiKey: string;
        timestamp: number;
        signature: string;
        folder: string;
        publicId: string;
        overwrite: string;
        invalidate: string;
      };

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signData.apiKey);
      formData.append("timestamp", String(signData.timestamp));
      formData.append("signature", signData.signature);
      formData.append("folder", signData.folder);
      formData.append("public_id", signData.publicId);
      formData.append("overwrite", signData.overwrite);
      formData.append("invalidate", signData.invalidate);

      const uploadRes = await fetch(signData.uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Cloudinary upload failed");
      }

      const uploadJson = await uploadRes.json() as { secure_url: string };
      onChange(uploadJson.secure_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      void handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) void handleUpload(e.target.files[0]);
        }}
      />

      {value ? (
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="size-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-mono text-gray-500 dark:text-gray-400">{value}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
              : "border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
          }`}
        >
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {uploading ? "Uploading…" : "Click or drag file here to upload"}
          </div>
          {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
        </div>
      )}

      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
