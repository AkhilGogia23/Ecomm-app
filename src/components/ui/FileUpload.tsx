"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface FileUploadProps {
  onFilesAccepted: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSizeMb?: number;
  multiple?: boolean;
  className?: string;
}

export default function FileUpload({
  onFilesAccepted,
  accept = { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
  maxSizeMb = 5,
  multiple = true,
  className,
}: FileUploadProps) {
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setError(null);
      if (rejections.length > 0) {
        setError(rejections[0].errors[0]?.message ?? "Some files were rejected");
      }
      if (accepted.length > 0) {
        setPreviews((prev) => [
          ...prev,
          ...accepted.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
        ]);
        onFilesAccepted(accepted);
      }
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize: maxSizeMb * 1024 * 1024,
  });

  function removePreview(name: string) {
    setPreviews((prev) => prev.filter((p) => p.name !== name));
  }

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragActive
            ? "border-black bg-gray-50 dark:border-white dark:bg-neutral-800"
            : "border-gray-300 hover:border-gray-400 dark:border-neutral-700 dark:hover:border-neutral-600"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-neutral-400">
          {isDragActive ? "Drop files here" : "Drag & drop files here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-gray-400">Max {maxSizeMb}MB per file</p>
      </div>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {previews.map((p) => (
            <div key={p.name} className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 dark:border-neutral-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
              <button
                onClick={() => removePreview(p.name)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
                aria-label={`Remove ${p.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
