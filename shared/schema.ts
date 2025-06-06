import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  abstract: text("abstract"),
  keywords: text("keywords"),
  receivedDate: text("received_date"),
  revisedDate: text("revised_date"),
  acceptedDate: text("accepted_date"),
  funding: text("funding"),
  doi: text("doi"),
  authors: json("authors").$type<Author[]>().default([]),
  sections: json("sections").$type<Section[]>().default([]),
  references: json("references").$type<Reference[]>().default([]),
  figures: json("figures").$type<Figure[]>().default([]),
  settings: json("settings").$type<DocumentSettings>().default({
    fontSize: "9.5pt",
    columns: "double",
    exportFormat: "docx",
    includePageNumbers: true,
    includeCopyright: true
  }),
  createdAt: text("created_at").default(new Date().toISOString()),
  updatedAt: text("updated_at").default(new Date().toISOString())
});

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

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const updateDocumentSchema = insertDocumentSchema.partial();

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
