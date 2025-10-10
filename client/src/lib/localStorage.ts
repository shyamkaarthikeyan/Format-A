import type { Document, InsertDocument, UpdateDocument } from '@shared/schema';

const STORAGE_KEY = 'ieee_documents';

export interface IClientStorage {
  getDocument(id: string): Document | undefined;
  getAllDocuments(): Document[];
  createDocument(document: InsertDocument): Document;
  updateDocument(id: string, document: UpdateDocument): Document | undefined;
  deleteDocument(id: string): boolean;
}

export class LocalStorage implements IClientStorage {
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private getStoredDocuments(): Document[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  private saveDocuments(documents: Document[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  getDocument(id: string): Document | undefined {
    const documents = this.getStoredDocuments();
    return documents.find(doc => doc.id === id);
  }

  getAllDocuments(): Document[] {
    return this.getStoredDocuments();
  }

  createDocument(insertDocument: InsertDocument): Document {
    const documents = this.getStoredDocuments();
    const newDocument: Document = {
      id: this.generateId(),
      title: insertDocument.title || '',
      abstract: insertDocument.abstract || null,
      keywords: insertDocument.keywords || null,
      authors: insertDocument.authors || [],
      sections: insertDocument.sections || [],
      references: insertDocument.references || [],
      figures: insertDocument.figures || [],
      settings: insertDocument.settings || {
        fontSize: "10pt",
        columns: "2",
        exportFormat: "docx",
        includePageNumbers: true,
        includeCopyright: false
      }
    };

    documents.push(newDocument);
    this.saveDocuments(documents);
    return newDocument;
  }

  updateDocument(id: string, updateDocument: UpdateDocument): Document | undefined {
    const documents = this.getStoredDocuments();
    const docIndex = documents.findIndex(doc => doc.id === id);
    
    if (docIndex === -1) return undefined;

    const updatedDocument: Document = {
      ...documents[docIndex],
      ...updateDocument
    };

    documents[docIndex] = updatedDocument;
    this.saveDocuments(documents);
    return updatedDocument;
  }

  deleteDocument(id: string): boolean {
    const documents = this.getStoredDocuments();
    const filteredDocuments = documents.filter(doc => doc.id !== id);
    
    if (filteredDocuments.length === documents.length) return false;
    
    this.saveDocuments(filteredDocuments);
    return true;
  }
}

export const clientStorage = new LocalStorage();