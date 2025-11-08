import { z } from "zod";

// User authentication and profile interfaces
export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  isActive: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  emailNotifications: boolean;
  defaultExportFormat: 'docx' | 'pdf';
  theme: 'light' | 'dark';
}

// Download tracking interfaces
export interface DownloadRecord {
  id: string;
  userId: string;
  documentId: string;
  documentTitle: string;
  fileFormat: 'docx' | 'pdf';
  fileSize: number;
  downloadedAt: string;
  ipAddress: string;
  userAgent: string;
  status: DownloadStatus;
  emailSent: boolean;
  emailSentAt?: string;
  emailError?: string;
  documentMetadata: DocumentMetadata;
}

export type DownloadStatus = 'pending' | 'completed' | 'failed' | 'expired';

export interface DocumentMetadata {
  pageCount: number;
  wordCount: number;
  sectionCount: number;
  figureCount: number;
  referenceCount: number;
  generationTime: number;
}

// Session management interface
export interface UserSession {
  sessionId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  lastAccessedAt: string;
  ipAddress: string;
  userAgent: string;
}

// Pagination interfaces
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedDownloads {
  downloads: DownloadRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

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
  type: "text" | "image" | "table" | "equation";
  content?: string;
  imageId?: string;
  data?: string; // base64 encoded image data
  fileName?: string; // original filename for user feedback
  caption?: string;
  tableName?: string; // for table blocks
  equationNumber?: number; // for equation blocks
  size?: "very-small" | "small" | "medium" | "large";
  position?: "top" | "bottom" | "here";
  order: number;
}

export interface Subsection {
  id: string;
  title: string;
  content: string;
  contentBlocks?: ContentBlock[]; // Rich content blocks support
  order: number;
  level?: number; // 1 for main subsection, 2 for sub-subsection, etc.
  parentId?: string; // For nested subsections
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

export interface IterationHistory {
  version: number;
  timestamp: string;
  type: string;
  feedback?: string;
  changes: string[];
}

export interface DocumentIteration {
  version: number;
  history: IterationHistory[];
  lastModified: string;
}

export interface Table {
  id: string;
  type: 'image' | 'latex' | 'interactive';
  tableType?: 'image' | 'latex' | 'interactive'; // For backend compatibility
  tableName: string;
  caption: string;
  size: string;
  position: string;
  sectionId?: string;
  order: number;
  // For image tables
  data?: string;
  mimeType?: string;
  originalName?: string;
  fileName?: string;
  // For LaTeX tables
  latexCode?: string;
  // For interactive tables
  rows?: number;
  columns?: number;
  headers?: string[];
  tableData?: string[][];
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
  tables?: Table[];
  settings: DocumentSettings;
  iteration?: DocumentIteration;
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
      type: z.enum(["text", "image", "table", "equation"]),
      content: z.string().optional(),
      imageId: z.string().optional(),
      data: z.string().optional(), // base64 encoded image data
      fileName: z.string().optional(), // original filename for user feedback
      caption: z.string().optional(),
      tableName: z.string().optional(), // for table blocks
      equationNumber: z.number().optional(), // for equation blocks
      size: z.enum(["very-small", "small", "medium", "large"]).optional(),
      position: z.enum(["top", "bottom", "here"]).optional(),
      order: z.number()
    })),
    subsections: z.array(z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      contentBlocks: z.array(z.object({
        id: z.string(),
        type: z.enum(["text", "image", "table", "equation"]),
        content: z.string().optional(),
        imageId: z.string().optional(),
        data: z.string().optional(), // base64 encoded image data
        fileName: z.string().optional(), // original filename for user feedback
        caption: z.string().optional(),
        tableName: z.string().optional(), // for table blocks
        equationNumber: z.number().optional(), // for equation blocks
        size: z.enum(["very-small", "small", "medium", "large"]).optional(),
        position: z.enum(["top", "bottom", "here"]).optional(),
        order: z.number()
      })).optional(),
      order: z.number(),
      level: z.number().optional(),
      parentId: z.string().optional()
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
  tables: z.array(z.object({
    id: z.string(),
    type: z.enum(['image', 'latex', 'interactive']),
    tableType: z.enum(['image', 'latex', 'interactive']).optional(),
    tableName: z.string(),
    caption: z.string(),
    size: z.string(),
    position: z.string(),
    sectionId: z.string().optional(),
    order: z.number(),
    // For image tables
    data: z.string().optional(),
    mimeType: z.string().optional(),
    originalName: z.string().optional(),
    fileName: z.string().optional(),
    // For LaTeX tables
    latexCode: z.string().optional(),
    // For interactive tables
    rows: z.number().optional(),
    columns: z.number().optional(),
    headers: z.array(z.string()).optional(),
    tableData: z.array(z.array(z.string())).optional()
  })).optional().default([]),
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
  }),
  iteration: z.object({
    version: z.number(),
    history: z.array(z.object({
      version: z.number(),
      timestamp: z.string(),
      type: z.string(),
      feedback: z.string().optional(),
      changes: z.array(z.string())
    })),
    lastModified: z.string()
  }).optional()
});

export const updateDocumentSchema = insertDocumentSchema.partial();

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
