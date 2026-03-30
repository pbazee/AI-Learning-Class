"use client";

import { startTransition, useMemo, useState, type ReactNode } from "react";
import { Edit3, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toaster";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminModal,
  AdminPageIntro,
  AdminSelect,
  AdminStatCard,
  AdminStatGrid,
  AdminSwitch,
  AdminTextarea,
  CreateButton,
  EmptyState,
  FieldLabel,
} from "@/components/admin/ui";

type CrudActionResult = Promise<{ success: boolean; message: string }>;

function getClientErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export type SimpleCrudStat = {
  label: string;
  value: string | number;
  detail?: string;
  accent?: string;
};

export type SimpleCrudFieldRenderArgs<FormState extends Record<string, any>> = {
  form: FormState;
  value: FormState[keyof FormState];
  updateForm: (patch: Partial<FormState>) => void;
  setFieldValue: (value: string | number | boolean) => void;
};

export type SimpleCrudField<FormState extends Record<string, any>> = {
  name: keyof FormState & string;
  label: string;
  type: "text" | "textarea" | "email" | "number" | "select" | "switch" | "color" | "date" | "url";
  placeholder?: string;
  hint?: string;
  rows?: number;
  step?: string;
  options?: Array<{ label: string; value: string }>;
  emptyLabel?: string;
  colSpan?: 1 | 2;
  render?: (args: SimpleCrudFieldRenderArgs<FormState>) => ReactNode;
};

export type SimpleCrudColumn<T> = {
  header: string;
  cell: (item: T) => React.ReactNode;
  className?: string;
};

export function SimpleCrudManager<T extends { id: string }, FormState extends Record<string, any>>({
  title,
  description,
  stats,
  items,
  columns,
  fields,
  createLabel,
  dialogTitle,
  emptyTitle,
  emptyDescription,
  getEmptyForm,
  mapItemToForm,
  buildPayload,
  onSave,
  onDelete,
}: {
  title: string;
  description: string;
  stats: SimpleCrudStat[];
  items: T[];
  columns: SimpleCrudColumn<T>[];
  fields: Array<SimpleCrudField<FormState>>;
  createLabel: string;
  dialogTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  getEmptyForm: () => FormState;
  mapItemToForm: (item: T) => FormState;
  buildPayload: (form: FormState) => any;
  onSave: (payload: any) => CrudActionResult;
  onDelete: (id: string) => CrudActionResult;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(getEmptyForm());
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const hasItems = items.length > 0;
  const sortedFields = useMemo(() => fields, [fields]);

  function openCreate() {
    setForm(getEmptyForm());
    setOpen(true);
  }

  function openEdit(item: T) {
    setForm(mapItemToForm(item));
    setOpen(true);
  }

  function handleFieldChange(name: string, value: string | number | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit() {
    setBusy(true);
    startTransition(async () => {
      try {
        const result = await onSave(buildPayload(form));
        toast(result.message, result.success ? "success" : "error");

        if (result.success) {
          setOpen(false);
          router.refresh();
        }
      } catch (error) {
        toast(getClientErrorMessage(error), "error");
      } finally {
        setBusy(false);
      }
    });
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this record?");
    if (!confirmed) return;

    setBusy(true);
    startTransition(async () => {
      try {
        const result = await onDelete(id);
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        toast(getClientErrorMessage(error), "error");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title={title}
        description={description}
        actions={<CreateButton onClick={openCreate}>{createLabel}</CreateButton>}
      />

      <AdminStatGrid>
        {stats.map((stat) => (
          <AdminStatCard key={stat.label} {...stat} />
        ))}
      </AdminStatGrid>

      {!hasItems ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={<CreateButton onClick={openCreate}>{createLabel}</CreateButton>} />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {columns.map((column) => (
                    <th key={column.header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {column.header}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    {columns.map((column) => (
                      <td key={column.header} className="px-4 py-4 align-top">
                        {column.cell(item)}
                      </td>
                    ))}
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <AdminButton type="button" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(item)}>
                          Edit
                        </AdminButton>
                        <AdminButton type="button" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(item.id)}>
                          Delete
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title={dialogTitle}
        description="Update the fields below, then save your changes."
        footer={
          <div className="flex justify-end gap-3">
            <AdminButton type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="button" busy={busy} onClick={handleSubmit}>
              Save Changes
            </AdminButton>
          </div>
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          {sortedFields.map((field) => (
            <div key={field.name} className={field.colSpan === 2 ? "md:col-span-2" : undefined}>
              {field.render ? (
                field.render({
                  form,
                  value: form[field.name],
                  updateForm: (patch) => setForm((current) => ({ ...current, ...patch })),
                  setFieldValue: (value) => handleFieldChange(field.name, value),
                })
              ) : field.type === "textarea" ? (
                <>
                  <FieldLabel>{field.label}</FieldLabel>
                  <AdminTextarea
                    rows={field.rows || 5}
                    placeholder={field.placeholder}
                    value={(form[field.name] as string) || ""}
                    onChange={(event) => handleFieldChange(field.name, event.target.value)}
                  />
                </>
              ) : field.type === "select" ? (
                <>
                  <FieldLabel>{field.label}</FieldLabel>
                  <AdminSelect
                    value={(form[field.name] as string) || ""}
                    onChange={(event) => handleFieldChange(field.name, event.target.value)}
                  >
                    <option value="">{field.emptyLabel ?? "Select an option"}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AdminSelect>
                  {field.hint ? <p className="mt-2 text-xs text-muted-foreground">{field.hint}</p> : null}
                </>
              ) : field.type === "switch" ? (
                <AdminSwitch
                  checked={Boolean(form[field.name])}
                  onChange={(value) => handleFieldChange(field.name, value)}
                  label={field.label}
                  hint={field.hint}
                />
              ) : (
                <>
                  <FieldLabel>{field.label}</FieldLabel>
                  <AdminInput
                    type={field.type}
                    step={field.step}
                    placeholder={field.placeholder}
                    value={field.type === "number" ? String(form[field.name] ?? "") : ((form[field.name] as string) || "")}
                    onChange={(event) =>
                      handleFieldChange(
                        field.name,
                        field.type === "number"
                          ? event.target.value === ""
                            ? ""
                            : Number(event.target.value)
                          : event.target.value
                      )
                    }
                  />
                </>
              )}
              {!field.render && field.hint && field.type !== "switch" && field.type !== "select" ? (
                <p className="mt-2 text-xs text-muted-foreground">{field.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      </AdminModal>
    </div>
  );
}
