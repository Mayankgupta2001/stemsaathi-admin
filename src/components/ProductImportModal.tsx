"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import {
  parseProductSpreadsheet,
  type ParsedProductRow,
  type ImportSummary,
} from "@/lib/product-import";
import { authenticatedFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface ExistingProductInfo {
  id: string;
  name: string;
  category: string;
}

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  existingProducts?: ExistingProductInfo[];
  categories?: string[];
  onImportSuccess?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export default function ProductImportModal({
  isOpen,
  onClose,
  token,
  existingProducts = [],
  categories = [],
  onImportSuccess,
  onSuccess,
}: ProductImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<string>("Electronic Components");
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: Array<{ product: string; reason: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseError("");
    setParsedRows([]);
    setSummary(null);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseProductSpreadsheet(buffer, {
        defaultCategory,
        existingProducts,
      });

      if (result.rows.length === 0) {
        setParseError("The file does not contain any readable product rows.");
      } else {
        setParsedRows(result.rows);
        setSummary(result.summary);
      }
    } catch (err) {
      setParseError(
        (err as Error)?.message || "Failed to parse the file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV file."
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Sample 5 test products from Electronic Components dataset for safe verification (STEP 16)
  const handleLoadSampleTestSet = () => {
    const sampleCSV = `Product Name,Cost Price,Category,Description
Arduino Uno R3 DIP Microcontroller,220,Electronic Components,Original ATmega328P DIP board with USB cable for robotics & IoT experiments.
SG90 Micro Servo Motor 9g,65,Electronic Components,180-degree rotation miniature servo for robotic arms and steerable mechanisms.
HC-SR04 Ultrasonic Distance Sensor,75,Electronic Components,Dual-transducer sensor measuring 2cm to 400cm for obstacle avoidance robots.
830 Points Solderless Breadboard,110,Electronic Components,Dual power rails high-durability prototyping breadboard with adhesive back.
16x2 I2C Character LCD Module Blue Backlight,180,Electronic Components,Alphanumeric 16x2 display with integrated PCF8574 I2C adapter for Arduino.`;

    const encoder = new TextEncoder();
    const uint8 = encoder.encode(sampleCSV);
    const result = parseProductSpreadsheet(uint8, {
      defaultCategory: "Electronic Components",
      existingProducts,
    });

    setSelectedFile(new File([uint8], "Electronic_Components_Test_5_Items.csv", { type: "text/csv" }));
    setParsedRows(result.rows);
    setSummary(result.summary);
    setParseError("");
    setImportResult(null);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    // Filter valid rows for import based on duplicate mode
    const rowsToImport = parsedRows.filter((row) => {
      if (row.status === "invalid") return false;
      if (row.status === "duplicate" && duplicateMode === "skip") return false;
      return true;
    });

    if (rowsToImport.length === 0) {
      setParseError("No valid products eligible for import based on current settings.");
      return;
    }

    setIsImporting(true);
    setParseError("");

    try {
      const payload = {
        products: rowsToImport.map((row) => ({
          name: row.name,
          category: row.category,
          description: row.description,
          price: row.pricing.sellingPrice,
          originalPrice: row.pricing.originalPrice,
          images: row.images,
          stock: row.stock,
          badge: row.badge,
        })),
        duplicateMode,
      };

      const response = await authenticatedFetch<{
        success: boolean;
        imported: number;
        updated: number;
        skipped: number;
        failed: number;
        errors: Array<{ product: string; reason: string }>;
      }>("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        token,
      });

      if (!response.ok) {
        setParseError(response.error || "Import operation failed on the server.");
        return;
      }

      if (response.data) {
        setImportResult(response.data);
        const successMsg =
          `Successfully imported ${response.data.imported} product(s)` +
          (response.data.updated ? `, updated ${response.data.updated}` : "") +
          (response.data.skipped ? `, skipped ${response.data.skipped} duplicate(s)` : "");
        if (onImportSuccess) {
          onImportSuccess(successMsg);
        } else if (onSuccess) {
          onSuccess(successMsg);
        }
      }
    } catch {
      setParseError("Network error occurred while communicating with the import server.");
    } finally {
      setIsImporting(false);
    }
  };

  const visibleRows = parsedRows.filter((row) => {
    if (filterStatus === "all") return true;
    return row.status === filterStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <path d="M3 13.5v2A1.5 1.5 0 004.5 17h11a1.5 1.5 0 001.5-1.5v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M10 3v9M6.5 6.5L10 3l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bulk Import Products</h2>
              <p className="text-xs text-slate-500">
                Upload Excel (.xlsx, .xls) or CSV catalog with Cost Prices (automatically calculated: Selling = 2× Cost).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {importResult ? (
            /* Result Summary View */
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6">
                    <path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-emerald-950">Import Completed</h3>
                <p className="mt-1 text-sm text-emerald-800">
                  Product catalog has been synchronized with the database.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-white p-3 shadow-xs ring-1 ring-emerald-200">
                    <p className="text-xs font-medium text-slate-500">Imported (New)</p>
                    <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-xs ring-1 ring-emerald-200">
                    <p className="text-xs font-medium text-slate-500">Updated</p>
                    <p className="text-2xl font-bold text-indigo-600">{importResult.updated}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-xs ring-1 ring-emerald-200">
                    <p className="text-xs font-medium text-slate-500">Skipped (Duplicates)</p>
                    <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-xs ring-1 ring-emerald-200">
                    <p className="text-xs font-medium text-slate-500">Failed / Errors</p>
                    <p className="text-2xl font-bold text-rose-600">{importResult.failed}</p>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                    Errors encountered during import ({importResult.errors.length}):
                  </h4>
                  <ul className="mt-2 divide-y divide-rose-200 text-xs text-rose-800">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx} className="py-1.5 flex justify-between">
                        <span className="font-semibold">{err.product}</span>
                        <span>{err.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportResult(null);
                    setSelectedFile(null);
                    setParsedRows([]);
                    setSummary(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Upload and Preview View */
            <div className="space-y-6">
              {/* File Dropzone & Configuration */}
              <div className="grid gap-4 md:grid-cols-3">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className={`col-span-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                    selectedFile
                      ? "border-indigo-400 bg-indigo-50/30"
                      : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6">
                      <path d="M6 3.5h5.5L15 7v9.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 015 16.5v-11A1.5 1.5 0 016.5 3.5z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M11 3.5V7h3.5M7.5 11.5h5M7.5 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-indigo-900">{selectedFile.name}</p>
                      <p className="mt-1 text-xs text-indigo-700">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Click or drag another file to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Click to browse or drag & drop Excel / CSV file
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Supports .xlsx, .xls, .csv</p>
                    </div>
                  )}
                </div>

                {/* Import Configuration Card */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Default Category
                      </label>
                      <select
                        value={defaultCategory}
                        onChange={(e) => setDefaultCategory(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Used if category column is blank in file.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Duplicate Strategy
                      </label>
                      <select
                        value={duplicateMode}
                        onChange={(e) => setDuplicateMode(e.target.value as "skip" | "update")}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="skip">Skip duplicates (Safe)</option>
                        <option value="update">Update existing products</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={handleLoadSampleTestSet}
                      className="w-full rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      🧪 Load 5-Item Test Sample
                    </button>
                  </div>
                </div>
              </div>

              {/* Parsing State */}
              {isParsing && (
                <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  Parsing spreadsheet and calculating prices...
                </div>
              )}

              {/* Parse Error */}
              {parseError && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0 text-rose-500">
                    <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 6.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="10" cy="13.3" r="0.9" fill="currentColor" />
                  </svg>
                  <div>
                    <p className="font-semibold">Import Issue</p>
                    <p className="text-xs">{parseError}</p>
                  </div>
                </div>
              )}

              {/* Preview Section */}
              {summary && parsedRows.length > 0 && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        Total Rows: {summary.total}
                      </span>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setFilterStatus("all")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          filterStatus === "all"
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        All ({summary.total})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterStatus("ready")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          filterStatus === "ready"
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        ✓ Ready ({summary.ready})
                      </button>
                      {summary.duplicates > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterStatus("duplicate")}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            filterStatus === "duplicate"
                              ? "bg-amber-600 text-white"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          }`}
                        >
                          ⚠ Duplicates ({summary.duplicates})
                        </button>
                      )}
                      {summary.warnings > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterStatus("warning")}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            filterStatus === "warning"
                              ? "bg-sky-600 text-white"
                              : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                          }`}
                        >
                          Notice ({summary.warnings})
                        </button>
                      )}
                      {summary.invalid > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterStatus("invalid")}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            filterStatus === "invalid"
                              ? "bg-rose-600 text-white"
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          ✕ Invalid ({summary.invalid})
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      Pricing formula applied: <span className="font-semibold text-slate-700">Selling = Cost × 2</span>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="max-h-72 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 z-10">
                        <tr>
                          <th className="px-3 py-2.5 font-bold uppercase text-slate-600">#</th>
                          <th className="px-3 py-2.5 font-bold uppercase text-slate-600">Product Name</th>
                          <th className="px-3 py-2.5 font-bold uppercase text-slate-600">Category</th>
                          <th className="px-3 py-2.5 font-bold uppercase text-slate-600">Cost Price</th>
                          <th className="px-3 py-2.5 font-bold uppercase text-indigo-700 bg-indigo-50/50">
                            Selling Price (2×)
                          </th>
                          <th className="px-3 py-2.5 font-bold uppercase text-slate-600">Original MRP</th>
                          <th className="px-3 py-2.5 font-bold uppercase text-slate-600">Image Mapping</th>
                          <th className="px-3 py-2.5 font-bold uppercase text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {visibleRows.map((row) => {
                          const statusBadgeClass =
                            row.status === "ready"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : row.status === "duplicate"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              : row.status === "warning"
                              ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200";

                          return (
                            <tr key={row.rowNumber} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono text-slate-400">{row.rowNumber}</td>
                              <td className="px-3 py-2 font-medium text-slate-900 max-w-xs truncate" title={row.name}>
                                {row.name || <span className="text-rose-500 italic">Empty Name</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{row.category}</td>
                              <td className="px-3 py-2 text-slate-600 font-mono">
                                ₹{row.pricing.costPrice}
                              </td>
                              <td className="px-3 py-2 font-bold text-indigo-900 bg-indigo-50/30 font-mono">
                                {formatCurrency(row.pricing.sellingPrice)}
                              </td>
                              <td className="px-3 py-2 text-slate-500 line-through font-mono">
                                {formatCurrency(row.pricing.originalPrice)}
                              </td>
                              <td className="px-3 py-2">
                                {row.imageMapped ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-emerald-500">
                                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                                    </svg>
                                    Mapped
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-700 text-[11px]">
                                    ⚠ Placeholder
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass}`}>
                                  {row.status === "ready"
                                    ? "Ready"
                                    : row.status === "duplicate"
                                    ? "Duplicate"
                                    : row.status === "warning"
                                    ? "Notice"
                                    : "Invalid"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  {summary ? (
                    <>
                      Eligible to import:{" "}
                      <span className="font-bold text-slate-800">
                        {duplicateMode === "skip" ? summary.ready : summary.ready + summary.duplicates}
                      </span>{" "}
                      of {summary.total} rows.
                    </>
                  ) : (
                    "Upload a catalog spreadsheet to preview items."
                  )}
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!summary || isImporting || (summary.ready === 0 && duplicateMode === "skip")}
                    onClick={handleExecuteImport}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Importing to Database...
                      </>
                    ) : (
                      `Confirm & Import Products (${
                        summary
                          ? duplicateMode === "skip"
                            ? summary.ready
                            : summary.ready + summary.duplicates
                          : 0
                      })`
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
