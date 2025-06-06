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
    return Array.from(this.documents.values()).sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentId++;
    const now = new Date().toISOString();
    const document: Document = { 
      id, 
      title: insertDocument.title,
      abstract: insertDocument.abstract || null,
      keywords: insertDocument.keywords || null,
      receivedDate: insertDocument.receivedDate || null,
      revisedDate: insertDocument.revisedDate || null,
      acceptedDate: insertDocument.acceptedDate || null,
      funding: insertDocument.funding || null,
      doi: insertDocument.doi || null,
      authors: Array.isArray(insertDocument.authors) ? insertDocument.authors : [],
      sections: Array.isArray(insertDocument.sections) ? insertDocument.sections : [],
      references: Array.isArray(insertDocument.references) ? insertDocument.references : [],
      figures: Array.isArray(insertDocument.figures) ? insertDocument.figures : [],
      settings: insertDocument.settings || {
        fontSize: "9.5pt",
        columns: "double",
        exportFormat: "docx" as const,
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
      title: updateDocument.title !== undefined ? updateDocument.title : existing.title,
      abstract: updateDocument.abstract !== undefined ? updateDocument.abstract : existing.abstract,
      keywords: updateDocument.keywords !== undefined ? updateDocument.keywords : existing.keywords,
      receivedDate: updateDocument.receivedDate !== undefined ? updateDocument.receivedDate : existing.receivedDate,
      revisedDate: updateDocument.revisedDate !== undefined ? updateDocument.revisedDate : existing.revisedDate,
      acceptedDate: updateDocument.acceptedDate !== undefined ? updateDocument.acceptedDate : existing.acceptedDate,
      funding: updateDocument.funding !== undefined ? updateDocument.funding : existing.funding,
      doi: updateDocument.doi !== undefined ? updateDocument.doi : existing.doi,
      authors: updateDocument.authors !== undefined ? updateDocument.authors : existing.authors,
      sections: updateDocument.sections !== undefined ? updateDocument.sections : existing.sections,
      references: updateDocument.references !== undefined ? updateDocument.references : existing.references,
      figures: updateDocument.figures !== undefined ? updateDocument.figures : existing.figures,
      settings: updateDocument.settings !== undefined ? updateDocument.settings : existing.settings,
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
