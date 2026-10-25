"use client";

import { useState, useRef, type DragEvent } from "react";
import { Button } from "./AdminPrimitives";

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
  maxSizeBytes = 2 * 1024 * 1024, // 2MB default
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
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-between">
        <span className="block text-meta font-medium text-ink">{label}</span>
        {hint && <span className="text-[11px] text-faint">{hint}</span>}
      </div>
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
        <div className="flex items-center gap-4 rounded-2xl border border-hairline bg-card p-3 shadow-xs">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-hairline-strong bg-alt p-1.5 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="size-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-meta font-mono text-mute">{value}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => onChange(null)}
              className="text-down hover:bg-down/10"
            >
              Remove
            </Button>
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
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? "border-accent bg-accent/10"
              : "border-hairline-strong hover:border-accent bg-card/40"
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-cell text-mute">
              <span className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span>Uploading asset…</span>
            </div>
          ) : (
            <div className="py-2">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-alt text-mute">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-cell font-medium text-ink">Click or drag file to upload</p>
              <p className="mt-1 text-meta text-faint">PNG, JPG, SVG, WebP up to {(maxSizeBytes / (1024 * 1024)).toFixed(0)} MB</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-meta font-medium text-down">{error}</p>}
    </div>
  );
}
