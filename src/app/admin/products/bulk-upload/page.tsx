"use client";

import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Download, Upload as UploadIcon, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import FileUpload from "@/components/ui/FileUpload";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import ProgressBar from "@/components/ui/ProgressBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { toast } from "@/store/toast";
import { cn } from "@/lib/cn";
import type { CsvRow } from "@/lib/utils/csv-parser";

interface RowIssue {
  row: number;
  field?: string;
  message: string;
}

interface ValidationResult {
  validCount: number;
  invalidCount: number;
  warningCount: number;
  total: number;
  valid: CsvRow[];
  invalid: { row: number; data: CsvRow; errors: RowIssue[] }[];
  warnings: RowIssue[];
}

interface ImportResult {
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: RowIssue[];
}

type Stage = "upload" | "preview" | "importing" | "done";

export default function BulkProductUploadPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"create" | "update" | "upsert">("upsert");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  function downloadTemplate() {
    window.open("/api/admin/products/bulk-upload/template?type=products", "_blank");
  }

  function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setRows(results.data);
        setBusy(true);
        try {
          const res = await fetch("/api/admin/products/bulk-upload/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: results.data }),
          });
          const json = await res.json();
          if (json.success) {
            setValidation(json.data);
            setStage("preview");
          } else {
            toast.error(json.error ?? "Failed to validate file");
          }
        } finally {
          setBusy(false);
        }
      },
      error: () => toast.error("Failed to parse CSV file"),
    });
  }

  function rowNumFor(row: CsvRow, index: number) {
    return rows.indexOf(row) + 2 || index + 2;
  }

  function toggleExclude(rowNum: number) {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  }

  async function handleImport() {
    if (!validation) return;
    setStage("importing");

    const includedRows = rows.filter((row, i) => !excludedRows.has(rowNumFor(row, i)));

    try {
      const res = await fetch("/api/admin/products/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: includedRows, mode }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        setStage("done");
      } else {
        toast.error(json.error ?? "Import failed");
        setStage("preview");
      }
    } catch {
      toast.error("Import failed");
      setStage("preview");
    }
  }

  function downloadErrorReport() {
    if (!result) return;
    const csv = Papa.unparse(result.errors.map((e) => ({ row: e.row, field: e.field ?? "", message: e.message })));
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setStage("upload");
    setRows([]);
    setValidation(null);
    setExcludedRows(new Set());
    setResult(null);
  }

  const invalidRowNums = new Set(validation?.invalid.map((i) => i.row) ?? []);
  const warningRowNums = new Set(validation?.warnings.map((w) => w.row) ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Product Upload</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Import multiple products from a CSV file
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4" /> Download Template
        </Button>
      </div>

      {stage === "upload" && (
        <Card>
          <CardBody>
            <FileUpload
              onFilesAccepted={handleFiles}
              accept={{ "text/csv": [".csv"] }}
              multiple={false}
              maxSizeMb={10}
            />
            {busy && <p className="mt-3 text-sm text-gray-500">Validating file...</p>}
          </CardBody>
        </Card>
      )}

      {stage === "preview" && validation && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" /> {validation.validCount} valid
            </span>
            <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" /> {validation.invalidCount} errors
            </span>
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> {validation.warningCount} warnings
            </span>
            <span className="ml-auto text-gray-500 dark:text-neutral-400">{rows.length} total rows</span>
          </div>

          <Card>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
                    <th className="px-3 py-2">Include</th>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Base Price</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const rowNum = rowNumFor(row, i);
                    const invalidEntry = validation.invalid.find((e) => e.row === rowNum);
                    const isInvalid = invalidRowNums.has(rowNum);
                    const isWarning = warningRowNums.has(rowNum);
                    const excluded = excludedRows.has(rowNum);

                    return (
                      <tr
                        key={rowNum}
                        className={cn(
                          "border-b border-gray-100 last:border-0 dark:border-neutral-800/50",
                          isInvalid && "bg-red-50 dark:bg-red-950/30",
                          !isInvalid && isWarning && "bg-amber-50 dark:bg-amber-950/30",
                          excluded && "opacity-40"
                        )}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!excluded}
                            onChange={() => toggleExclude(rowNum)}
                          />
                        </td>
                        <td className="px-3 py-2">{rowNum}</td>
                        <td className="px-3 py-2">
                          <input
                            value={row.title ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, title: value } : r)));
                            }}
                            className="w-40 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-gray-300 focus:border-gray-400 focus:outline-none dark:hover:border-neutral-700"
                          />
                        </td>
                        <td className="px-3 py-2">{row.sku}</td>
                        <td className="px-3 py-2">
                          <input
                            value={row.base_price ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, base_price: value } : r)));
                            }}
                            className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-gray-300 focus:border-gray-400 focus:outline-none dark:hover:border-neutral-700"
                          />
                        </td>
                        <td className="px-3 py-2">{row.status || "DRAFT"}</td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">
                          {invalidEntry?.errors.map((e) => e.message).join("; ")}
                          {isWarning && !isInvalid && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {validation.warnings.filter((w) => w.row === rowNum).map((w) => w.message).join("; ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <div className="flex items-center justify-between">
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              options={[
                { label: "Create only", value: "create" },
                { label: "Update existing", value: "update" },
                { label: "Create + Update", value: "upsert" },
              ]}
              className="w-52"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={handleImport}>
                <UploadIcon className="h-4 w-4" /> Import {rows.length - excludedRows.size} products
              </Button>
            </div>
          </div>
        </>
      )}

      {stage === "importing" && (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="mb-4 text-sm text-gray-600 dark:text-neutral-400">Importing products...</p>
            <ProgressBar value={70} showLabel={false} className="mx-auto max-w-sm" />
          </CardBody>
        </Card>
      )}

      {stage === "done" && result && (
        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900 dark:text-white">Import Complete</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{result.successCount}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Succeeded</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{result.errorCount}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Errors</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{result.skippedCount}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Skipped</p>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              {result.errors.length > 0 && (
                <Button variant="outline" onClick={downloadErrorReport}>
                  <Download className="h-4 w-4" /> Download Error Report
                </Button>
              )}
              <Link href="/admin/products">
                <Button>View Imported Products</Button>
              </Link>
              <Button variant="secondary" onClick={reset}>
                Import Another File
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
