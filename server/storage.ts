import { documents, type Document, type InsertDocument, type UpdateDocument } from "@shared/schema";

export interface IStorage {
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: UpdateDocument): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document>;
  private currentId: number;

  constructor() {
    this.documents = new Map();
    this.currentId = 1;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort((a, b) => 
      new Date(b.updatedAt || new Date()).getTime() - new Date(a.updatedAt || new Date()).getTime()
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentId++;
    const now = new Date().toISOString();
    const document: Document = { 
      id,
      title: insertDocument.title || "",
      abstract: insertDocument.abstract || null,
      keywords: insertDocument.keywords || null,
      receivedDate: insertDocument.receivedDate || null,
      revisedDate: insertDocument.revisedDate || null,
      acceptedDate: insertDocument.acceptedDate || null,
      funding: insertDocument.funding || null,
      acknowledgments: insertDocument.acknowledgments || null,
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
      createdAt: now,
      updatedAt: now
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updateDocument: UpdateDocument): Promise<Document | undefined> {
    const existing = this.documents.get(id);
    if (!existing) return undefined;

    const updated: Document = {
      ...existing,
      ...updateDocument,
      updatedAt: new Date().toISOString()
    };
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
}

export const storage = new MemStorage();
