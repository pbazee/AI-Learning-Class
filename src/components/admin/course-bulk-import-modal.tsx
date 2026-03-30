"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { bulkImportCoursesAction } from "@/app/admin/actions";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminModal,
  AdminSelect,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/toaster";

type MappingField =
  | "title"
  | "description"
  | "shortDescription"
  | "category"
  | "price"
  | "level"
  | "language"
  | "status"
  | "isFeatured"
  | "isTrending"
  | "isRecommended"
  | "isFree"
  | "tags"
  | "whatYouLearn"
  | "requirements";

type RawImportRow = Record<string, string>;

const mappingConfig: Array<{ key: MappingField; label: string; required?: boolean }> = [
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", required: true },
  { key: "shortDescription", label: "Short Description" },
  { key: "category", label: "Category", required: true },
  { key: "price", label: "Price" },
  { key: "level", label: "Level" },
  { key: "language", label: "Language" },
  { key: "status", label: "Status" },
  { key: "isFeatured", label: "Featured" },
  { key: "isTrending", label: "Trending" },
  { key: "isRecommended", label: "Recommended" },
  { key: "isFree", label: "Free" },
  { key: "tags", label: "Tags" },
  { key: "whatYouLearn", label: "What You'll Learn" },
  { key: "requirements", label: "Requirements" },
];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function splitListValue(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value?: string) {
  const normalized = value?.trim().toLowerCase();
  return ["true", "1", "yes", "y", "featured", "recommended", "free"].includes(normalized || "");
}

function parseLevel(value?: string): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS" {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "advanced") return "ADVANCED";
  if (normalized === "intermediate") return "INTERMEDIATE";
  if (normalized === "all levels" || normalized === "alllevels") return "ALL_LEVELS";
  return "BEGINNER";
}

function parseStatus(value?: string): "DRAFT" | "PUBLISHED" {
  const normalized = value?.trim().toLowerCase();
  return normalized === "published" ? "PUBLISHED" : "DRAFT";
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentValue = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentValue.trim());
      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    if (currentRow.some((value) => value.length > 0)) {
      rows.push(currentRow);
    }
  }

  const [headerRow = [], ...valueRows] = rows;
  const headers = headerRow.map((header) => header.trim()).filter(Boolean);

  const parsedRows = valueRows.map((row) =>
    headers.reduce<RawImportRow>((accumulator, header, index) => {
      accumulator[header] = row[index] ?? "";
      return accumulator;
    }, {})
  );

  return { headers, rows: parsedRows };
}

function autoMapHeaders(headers: string[]) {
  const nextMapping = {} as Record<MappingField, string>;

  mappingConfig.forEach((field) => {
    const matchedHeader = headers.find((header) => {
      const normalizedHeader = normalizeHeader(header);
      const normalizedField = normalizeHeader(field.key);

      return (
        normalizedHeader === normalizedField ||
        normalizedHeader.includes(normalizedField) ||
        normalizedField.includes(normalizedHeader)
      );
    });

    nextMapping[field.key] = matchedHeader || "";
  });

  return nextMapping;
}

export function CourseBulkImportModal({
  open,
  onClose,
  instructorOptions,
}: {
  open: boolean;
  onClose: () => void;
  instructorOptions: Array<{ label: string; value: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawImportRow[]>([]);
  const [mapping, setMapping] = useState<Record<MappingField, string>>(
    mappingConfig.reduce((accumulator, field) => {
      accumulator[field.key] = "";
      return accumulator;
    }, {} as Record<MappingField, string>)
  );
  const [defaultInstructorId, setDefaultInstructorId] = useState(instructorOptions[0]?.value || "");
  const [lastErrors, setLastErrors] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!defaultInstructorId && instructorOptions[0]?.value) {
      setDefaultInstructorId(instructorOptions[0].value);
    }
  }, [defaultInstructorId, instructorOptions]);

  const missingRequiredFields = mappingConfig.filter(
    (field) => field.required && !mapping[field.key]
  );

  const previewCourses = useMemo(() => {
    return rows.slice(0, 5).map((row, index) => ({
      id: `${index}`,
      title: row[mapping.title] || "Untitled course",
      category: row[mapping.category] || "Missing category",
      price: row[mapping.price] || "0",
      status: parseStatus(row[mapping.status]),
    }));
  }, [mapping, rows]);

  async function handleFileSelected(file: File) {
    const text = await file.text();
    let nextHeaders: string[] = [];
    let nextRows: RawImportRow[] = [];

    if (file.name.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(text);
      const rawRows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.courses) ? parsed.courses : [];

      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        throw new Error("The JSON file must contain an array of course objects.");
      }

      nextRows = rawRows.map((row) =>
        Object.entries(row as Record<string, unknown>).reduce<RawImportRow>((accumulator, [key, value]) => {
          accumulator[key] = Array.isArray(value) ? value.join(", ") : String(value ?? "");
          return accumulator;
        }, {})
      );
      nextHeaders = Object.keys(nextRows[0] || {});
    } else {
      const parsed = parseCsv(text);
      nextHeaders = parsed.headers;
      nextRows = parsed.rows;
    }

    setFileName(file.name);
    setHeaders(nextHeaders);
    setRows(nextRows);
    setMapping(autoMapHeaders(nextHeaders));
    setLastErrors([]);
  }

  function buildNormalizedRows() {
    return rows
      .map((row) => ({
        title: row[mapping.title]?.trim() || "",
        description: row[mapping.description]?.trim() || "",
        shortDescription: row[mapping.shortDescription]?.trim() || "",
        category: row[mapping.category]?.trim() || "",
        price: Number(row[mapping.price] || 0),
        level: parseLevel(row[mapping.level]),
        language: row[mapping.language]?.trim() || "English",
        status: parseStatus(row[mapping.status]),
        isFeatured: parseBoolean(row[mapping.isFeatured]),
        isTrending: parseBoolean(row[mapping.isTrending]),
        isRecommended: parseBoolean(row[mapping.isRecommended]),
        isFree: parseBoolean(row[mapping.isFree]),
        tags: splitListValue(row[mapping.tags]),
        whatYouLearn: splitListValue(row[mapping.whatYouLearn]),
        requirements: splitListValue(row[mapping.requirements]),
      }))
      .filter((row) => row.title && row.description && row.category);
  }

  function resetState() {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setLastErrors([]);
    setMapping(
      mappingConfig.reduce((accumulator, field) => {
        accumulator[field.key] = "";
        return accumulator;
      }, {} as Record<MappingField, string>)
    );
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleImport() {
    if (!defaultInstructorId) {
      toast("Choose a default instructor for imported courses.", "error");
      return;
    }

    if (missingRequiredFields.length > 0) {
      toast("Map the required fields before importing.", "error");
      return;
    }

    const normalizedRows = buildNormalizedRows();

    if (normalizedRows.length === 0) {
      toast("No valid rows were found after applying the field mapping.", "error");
      return;
    }

    setBusy(true);
    startTransition(async () => {
      try {
        const result = await bulkImportCoursesAction({
          defaultInstructorId,
          courses: normalizedRows,
        });

        if (!result.success) {
          toast(result.message, "error");
          return;
        }

        const imported = result.data?.imported ?? normalizedRows.length;
        const errors = result.data?.errors ?? [];
        setLastErrors(errors);
        toast(
          errors.length > 0
            ? `Imported ${imported} courses with ${errors.length} skipped row(s).`
            : `Imported ${imported} courses successfully.`,
          errors.length > 0 ? "info" : "success"
        );

        router.refresh();
        if (errors.length === 0) {
          handleClose();
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Bulk import failed.", "error");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <AdminModal
      open={open}
      onClose={handleClose}
      title="Bulk Import Courses"
      description="Upload a CSV or JSON export, map the incoming columns, and import courses in one batch."
      size="xl"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <AdminButton type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </AdminButton>
          <AdminButton type="button" busy={busy} onClick={handleImport}>
            Import Courses
          </AdminButton>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <AdminCard className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Upload source file</p>
                <p className="mt-1 text-sm text-slate-400">
                  Supported formats: `.csv` and `.json`.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
                <UploadCloud className="h-4 w-4" />
                Choose File
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    try {
                      await handleFileSelected(file);
                    } catch (error) {
                      toast(error instanceof Error ? error.message : "Unable to read that file.", "error");
                    } finally {
                      event.target.value = "";
                    }
                  }}
                />
              </label>
            </div>

            {fileName ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{fileName}</p>
                  <p className="text-xs text-slate-400">
                    {rows.length} row(s) detected • {headers.length} column(s)
                  </p>
                </div>
              </div>
            ) : null}
          </AdminCard>

          <AdminCard className="p-5">
            <div className="flex flex-col gap-5">
              <div>
                <FieldLabel>Default Instructor</FieldLabel>
                <AdminSelect
                  value={defaultInstructorId}
                  onChange={(event) => setDefaultInstructorId(event.target.value)}
                >
                  {instructorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-white">Field Mapping</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {mappingConfig.map((field) => (
                    <div key={field.key}>
                      <FieldLabel>
                        {field.label}
                        {field.required ? " *" : ""}
                      </FieldLabel>
                      <AdminSelect
                        value={mapping[field.key]}
                        onChange={(event) =>
                          setMapping((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Skip this field</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </AdminSelect>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminCard>
        </div>

        <div className="space-y-5">
          <AdminCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Import Preview</p>
                <p className="mt-1 text-sm text-slate-400">
                  Review the first few mapped records before importing.
                </p>
              </div>
              {missingRequiredFields.length === 0 ? (
                <StatusPill tone="success">Ready</StatusPill>
              ) : (
                <StatusPill tone="warning">Needs mapping</StatusPill>
              )}
            </div>

            {previewCourses.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                Upload a source file to preview the mapped courses here.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {previewCourses.map((course) => (
                  <div key={course.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-semibold text-white">{course.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{course.category}</span>
                      <span>•</span>
                      <span>{course.price || "0"}</span>
                      <span>•</span>
                      <span>{course.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {missingRequiredFields.length > 0 ? (
            <AdminCard className="p-5">
              <p className="text-sm font-semibold text-white">Missing required mappings</p>
              <p className="mt-2 text-sm text-slate-400">
                Map these fields before import: {missingRequiredFields.map((field) => field.label).join(", ")}.
              </p>
            </AdminCard>
          ) : null}

          {lastErrors.length > 0 ? (
            <AdminCard className="p-5">
              <p className="text-sm font-semibold text-white">Skipped rows</p>
              <div className="mt-3 space-y-2">
                {lastErrors.slice(0, 5).map((error) => (
                  <div key={error} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {error}
                  </div>
                ))}
              </div>
            </AdminCard>
          ) : null}
        </div>
      </div>
    </AdminModal>
  );
}
