import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  name: z.string().min(2, "Category name is required."),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  imagePath: z.string().optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  parentId: z.string().optional().nullable(),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function optionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function nullableString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function nullableMediaField(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function revalidateCategoryPages() {
  ["/admin", "/admin/categories", "/courses", "/blog", "/"].forEach((path) =>
    revalidatePath(path)
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const values = categorySchema.parse(body);
    const slug = slugify(values.slug || values.name);
    const imageUrl = nullableMediaField(values.imageUrl);
    const imagePath = nullableMediaField(values.imagePath);

    const category = await prisma.category.create({
      data: {
        name: values.name.trim(),
        slug,
        description: optionalString(values.description),
        imageUrl,
        imagePath,
        icon: optionalString(values.icon),
        color: optionalString(values.color),
        isActive: Boolean(values.isActive),
        parentId: nullableString(values.parentId),
      },
    });

    revalidateCategoryPages();

    return NextResponse.json({
      success: true,
      message: "Category saved successfully.",
      category,
    });
  } catch (error) {
    console.error("[admin.categories] Unable to create category.", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Please review the category details." },
        { status: 400 }
      );
    }

    return new Response("Internal server error", { status: 500 });
  }
}
