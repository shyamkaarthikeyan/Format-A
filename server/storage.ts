import { type Document, type InsertDocument, type UpdateDocument } from "@shared/schema";

// Extended document interface for server-side storage
interface ServerDocument extends Document {
  createdAt?: string;
  updatedAt?: string;
  receivedDate?: string | null;
  revisedDate?: string | null;
  acceptedDate?: string | null;
  funding?: string | null;
  acknowledgments?: string | null;
  doi?: string | null;
}

export interface IStorage {
  getDocument(id: string): Promise<ServerDocument | undefined>;
  getAllDocuments(): Promise<ServerDocument[]>;
  createDocument(document: InsertDocument): Promise<ServerDocument>;
  updateDocument(id: string, document: UpdateDocument): Promise<ServerDocument | undefined>;
  deleteDocument(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, ServerDocument>;
  private currentId: number;

  constructor() {
    this.documents = new Map();
    this.currentId = 1;
  }

  async getDocument(id: string): Promise<ServerDocument | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<ServerDocument[]> {
    return Array.from(this.documents.values()).sort((a, b) => 
      new Date(b.updatedAt || new Date()).getTime() - new Date(a.updatedAt || new Date()).getTime()
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<ServerDocument> {
    const id = `doc_${this.currentId++}`;
    const now = new Date().toISOString();
    const document: ServerDocument = { 
      id,
      title: insertDocument.title || "",
      abstract: insertDocument.abstract || null,
      keywords: insertDocument.keywords || null,
      authors: insertDocument.authors || [],
      sections: insertDocument.sections || [],
      references: insertDocument.references || [],
      figures: insertDocument.figures || [],
      settings: insertDocument.settings || {
        fontSize: "9.5pt",
        columns: "2",
        exportFormat: "docx",
        includePageNumbers: true,
        includeCopyright: true
      },
      // Server-specific fields
      createdAt: now,
      updatedAt: now,
      receivedDate: null,
      revisedDate: null,
      acceptedDate: null,
      funding: null,
      acknowledgments: null,
      doi: null
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: string, updateDocument: UpdateDocument): Promise<ServerDocument | undefined> {
    const existing = this.documents.get(id);
    if (!existing) return undefined;

    const updated: ServerDocument = {
      ...existing,
      ...updateDocument,
      updatedAt: new Date().toISOString()
    };
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }
}

export const storage = new MemStorage();
