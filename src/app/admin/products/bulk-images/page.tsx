"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload as UploadIcon, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import FileUpload from "@/components/ui/FileUpload";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import ProgressBar from "@/components/ui/ProgressBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { toast } from "@/store/toast";
import { cn } from "@/lib/cn";
import { extractSkuFromFilename } from "@/lib/utils/sku-matcher";

interface VariantOption {
  id: string;
  sku: string;
  productTitle: string;
}

interface FileEntry {
  file: File;
  sku: string;
  position: number;
  status: "matched" | "unmatched" | "invalid";
  manualVariantId?: string;
  dimensions?: string;
}

type Stage = "upload" | "preview" | "uploading" | "done";

export default function BulkImageUploadPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [result, setResult] = useState<{
    matched: number;
    uploaded: number;
    failed: number;
    unmatched: string[];
    failedFiles: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadVariantOptions() {
    if (variantOptions.length > 0) return variantOptions;
    const res = await fetch("/api/admin/products?limit=500");
    const json = await res.json();
    if (!json.success) return [];
    const options: VariantOption[] = [];
    for (const p of json.data) {
      options.push({ id: p.id, sku: p.sku, productTitle: p.title });
    }
    setVariantOptions(options);
    return options;
  }

  async function handleFiles(files: File[]) {
    setBusy(true);
    try {
      const filenames = files.map((f) => f.name);
      const res = await fetch("/api/admin/products/bulk-images/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames }),
      });
      const json = await res.json();

      const matchedSet = new Map(json.data.matched.map((m: { filename: string; sku: string; position: number }) => [m.filename, m]));
      const unmatchedSet = new Set(json.data.unmatched.map((u: { filename: string }) => u.filename));

      const newEntries: FileEntry[] = files.map((file) => {
        const extracted = extractSkuFromFilename(file.name);
        if (matchedSet.has(file.name)) {
          const m = matchedSet.get(file.name) as { sku: string; position: number };
          return { file, sku: m.sku, position: m.position, status: "matched" };
        }
        if (unmatchedSet.has(file.name)) {
          return { file, sku: extracted.sku, position: extracted.position, status: "unmatched" };
        }
        return { file, sku: "", position: 0, status: "invalid" };
      });

      setEntries(newEntries);
      await loadVariantOptions();
      setStage("preview");

      // Best-effort dimension probing
      newEntries.forEach((entry, i) => {
        const url = URL.createObjectURL(entry.file);
        const img = new Image();
        img.onload = () => {
          setEntries((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, dimensions: `${img.width}×${img.height}` } : e))
          );
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });
    } finally {
      setBusy(false);
    }
  }

  function assignVariant(index: number, variantId: string) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, manualVariantId: variantId } : e)));
  }

  async function upload(filesToUpload: FileEntry[]) {
    setStage("uploading");
    const formData = new FormData();
    filesToUpload.forEach((e) => formData.append("files", e.file));

    const manualAssignments: Record<string, string> = {};
    filesToUpload.forEach((e) => {
      if (e.manualVariantId) manualAssignments[e.file.name] = e.manualVariantId;
    });
    formData.append("manualAssignments", JSON.stringify(manualAssignments));

    try {
      const res = await fetch("/api/admin/products/bulk-images", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        setStage("done");
      } else {
        toast.error(json.error ?? "Upload failed");
        setStage("preview");
      }
    } catch {
      toast.error("Upload failed");
      setStage("preview");
    }
  }

  function handleUploadMatched() {
    const uploadable = entries.filter((e) => e.status === "matched" || e.manualVariantId);
    if (uploadable.length === 0) {
      toast.error("No matched images to upload");
      return;
    }
    upload(uploadable);
  }

  function handleRetryFailed() {
    if (!result) return;
    const retryEntries = entries.filter((e) => result.failedFiles.includes(e.file.name));
    upload(retryEntries);
  }

  function reset() {
    setStage("upload");
    setEntries([]);
    setResult(null);
  }

  const matchedCount = entries.filter((e) => e.status === "matched").length;
  const unmatchedCount = entries.filter((e) => e.status === "unmatched").length;
  const invalidCount = entries.filter((e) => e.status === "invalid").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Image Upload</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          Name your files as <code>{"{SKU}_1.jpg"}</code>, <code>{"{SKU}_2.jpg"}</code> etc. The number sets
          the image order. <code>_1</code> becomes the thumbnail.
        </p>
      </div>

      {stage === "upload" && (
        <Card>
          <CardBody>
            <FileUpload
              onFilesAccepted={handleFiles}
              accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] }}
              multiple
              maxSizeMb={5}
            />
            {busy && <p className="mt-3 text-sm text-gray-500">Matching filenames...</p>}
          </CardBody>
        </Card>
      )}

      {stage === "preview" && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" /> {matchedCount} matched
            </span>
            <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" /> {unmatchedCount} unmatched
            </span>
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> {invalidCount} invalid
            </span>
            <span className="ml-auto text-gray-500 dark:text-neutral-400">{entries.length} files total</span>
          </div>

          <Card>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                    <th className="px-3 py-2">Filename</th>
                    <th className="px-3 py-2">Detected SKU</th>
                    <th className="px-3 py-2">Position</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Dimensions</th>
                    <th className="px-3 py-2">Assign</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr
                      key={entry.file.name + i}
                      className={cn(
                        "border-b border-gray-100 last:border-0 dark:border-neutral-800/50",
                        entry.status === "unmatched" && !entry.manualVariantId && "bg-red-50 dark:bg-red-950/30",
                        entry.status === "invalid" && "bg-amber-50 dark:bg-amber-950/30",
                        entry.status === "matched" && "bg-green-50/50 dark:bg-green-950/20"
                      )}
                    >
                      <td className="px-3 py-2">{entry.file.name}</td>
                      <td className="px-3 py-2">{entry.sku || "—"}</td>
                      <td className="px-3 py-2">{entry.position || "—"}</td>
                      <td className="px-3 py-2">
                        {entry.status === "matched" && "✅ Matched"}
                        {entry.status === "unmatched" && (entry.manualVariantId ? "🔗 Assigned" : "❌ Unmatched")}
                        {entry.status === "invalid" && "⚠️ Invalid"}
                      </td>
                      <td className="px-3 py-2">{(entry.file.size / 1024).toFixed(0)} KB</td>
                      <td className="px-3 py-2">{entry.dimensions ?? "…"}</td>
                      <td className="px-3 py-2">
                        {entry.status === "unmatched" && (
                          <Select
                            value={entry.manualVariantId ?? ""}
                            onChange={(e) => assignVariant(i, e.target.value)}
                            placeholder="Assign SKU..."
                            options={variantOptions.map((v) => ({ label: `${v.sku} (${v.productTitle})`, value: v.id }))}
                            className="w-48"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={handleUploadMatched}>
              <UploadIcon className="h-4 w-4" /> Upload {matchedCount + entries.filter((e) => e.manualVariantId).length} matched images
            </Button>
          </div>
        </>
      )}

      {stage === "uploading" && (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="mb-4 text-sm text-gray-600 dark:text-neutral-400">Uploading images...</p>
            <ProgressBar value={70} showLabel={false} className="mx-auto max-w-sm" />
          </CardBody>
        </Card>
      )}

      {stage === "done" && result && (
        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Upload Complete</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{result.uploaded}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Uploaded</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{result.failed}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{result.unmatched.length}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Unmatched</p>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              {result.failedFiles.length > 0 && (
                <Button variant="outline" onClick={handleRetryFailed}>
                  Retry {result.failedFiles.length} failed images
                </Button>
              )}
              <Link href="/admin/products">
                <Button>View Products</Button>
              </Link>
              <Button variant="secondary" onClick={reset}>
                Upload More
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
