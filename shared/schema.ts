import { z } from "zod";

export interface Author {
  id: string;
  name: string;
  department?: string;
  organization?: string;
  city?: string;
  state?: string;
  email?: string;
  customFields: CustomField[];
}

export interface CustomField {
  id: string;
  name: string;
  value: string;
}

export interface Section {
  id: string;
  title: string;
  contentBlocks: ContentBlock[];
  subsections: Subsection[];
  order: number;
}

export interface ContentBlock {
  id: string;
  type: "text" | "image";
  content?: string;
  imageId?: string;
  data?: string; // base64 encoded image data
  fileName?: string; // original filename for user feedback
  caption?: string;
  size?: "very-small" | "small" | "medium" | "large";
  position?: "top" | "bottom" | "here";
  order: number;
}

export interface Subsection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Reference {
  id: string;
  text: string;
  order: number;
}

export interface Figure {
  id: string;
  fileName: string;
  originalName: string;
  caption: string;
  size: "very-small" | "small" | "medium" | "large";
  position: "top" | "bottom" | "here";
  sectionId?: string;
  order: number;
  mimeType: string;
  data: string; // base64 encoded
}

export interface DocumentSettings {
  fontSize: string;
  columns: string;
  exportFormat: "docx" | "latex";
  includePageNumbers: boolean;
  includeCopyright: boolean;
}

export type Document = {
  id: string;
  title: string;
  abstract: string | null;
  keywords: string | null;
  authors: Author[];
  sections: Section[];
  references: Reference[];
  figures: Figure[];
  settings: DocumentSettings;
};

export const insertDocumentSchema = z.object({
  title: z.string(),
  abstract: z.string().nullable(),
  keywords: z.string().nullable(),
  authors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    department: z.string().optional(),
    organization: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    email: z.string().optional(),
    customFields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      value: z.string()
    }))
  })).default([]),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    contentBlocks: z.array(z.object({
      id: z.string(),
      type: z.enum(["text", "image"]),
      content: z.string().optional(),
      imageId: z.string().optional(),
      data: z.string().optional(), // base64 encoded image data
      fileName: z.string().optional(), // original filename for user feedback
      caption: z.string().optional(),
      size: z.enum(["very-small", "small", "medium", "large"]).optional(),
      position: z.enum(["top", "bottom", "here"]).optional(),
      order: z.number()
    })),
    subsections: z.array(z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      order: z.number()
    })),
    order: z.number()
  })).default([]),
  references: z.array(z.object({
    id: z.string(),
    text: z.string(),
    order: z.number()
  })).default([]),
  figures: z.array(z.object({
    id: z.string(),
    fileName: z.string(),
    originalName: z.string(),
    caption: z.string(),
    size: z.enum(["very-small", "small", "medium", "large"]),
    position: z.enum(["top", "bottom", "here"]),
    sectionId: z.string().optional(),
    order: z.number(),
    mimeType: z.string(),
    data: z.string()
  })).default([]),
  settings: z.object({
    fontSize: z.string(),
    columns: z.string(),
    exportFormat: z.enum(["docx", "latex"]),
    includePageNumbers: z.boolean(),
    includeCopyright: z.boolean()
  }).default({
    fontSize: "9.5pt",
    columns: "double",
    exportFormat: "docx",
    includePageNumbers: true,
    includeCopyright: true
  })
});

export const updateDocumentSchema = insertDocumentSchema.partial();

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
