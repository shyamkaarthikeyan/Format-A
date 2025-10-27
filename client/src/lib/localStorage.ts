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
      authors: (insertDocument.authors || []).map((author: any) => ({
        id: author.id || `author-${Date.now()}-${Math.random()}`,
        name: author.name || '',
        email: author.email || '',
        state: author.state || '',
        department: author.department || '',
        organization: author.organization || '',
        city: author.city || '',
        customFields: author.customFields || []
      })),
      sections: (insertDocument.sections || []).map((section: any) => ({
        id: section.id || `section-${Date.now()}-${Math.random()}`,
        title: section.title || '',
        order: section.order || 0,
        contentBlocks: section.contentBlocks || [],
        subsections: section.subsections || []
      })),
      references: (insertDocument.references || []).map((ref: any) => ({
        id: ref.id || `ref-${Date.now()}-${Math.random()}`,
        text: ref.text || '',
        order: ref.order || 0
      })),
      figures: (insertDocument.figures || []).map((figure: any) => ({
        id: figure.id || `figure-${Date.now()}-${Math.random()}`,
        caption: figure.caption || '',
        data: figure.data || '',
        order: figure.order || 0,
        size: figure.size || 'medium',
        fileName: figure.fileName || '',
        position: figure.position || 'here',
        originalName: figure.originalName || '',
        sectionId: figure.sectionId || '',
        mimeType: figure.mimeType || ''
      })),
      settings: {
        fontSize: insertDocument.settings?.fontSize || "10pt",
        columns: insertDocument.settings?.columns || "2",
        exportFormat: (insertDocument.settings?.exportFormat as "docx" | "latex") || "docx",
        includePageNumbers: insertDocument.settings?.includePageNumbers ?? true,
        includeCopyright: insertDocument.settings?.includeCopyright ?? false
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
      ...updateDocument,
      // Ensure required fields are properly typed
      authors: updateDocument.authors ? updateDocument.authors.map((author: any) => ({
        id: author.id || `author-${Date.now()}-${Math.random()}`,
        name: author.name || '',
        email: author.email || '',
        state: author.state || '',
        department: author.department || '',
        organization: author.organization || '',
        city: author.city || '',
        customFields: author.customFields || []
      })) : documents[docIndex].authors,
      sections: updateDocument.sections ? updateDocument.sections.map((section: any) => ({
        ...section,
        id: section.id || `section-${Date.now()}-${Math.random()}`,
        title: section.title || '',
        order: section.order || 0,
        contentBlocks: section.contentBlocks || [],
        subsections: section.subsections || []
      })) : documents[docIndex].sections,
      references: updateDocument.references ? updateDocument.references.map((ref: any) => ({
        ...ref,
        id: ref.id || `ref-${Date.now()}-${Math.random()}`,
        text: ref.text || '',
        order: ref.order || 0
      })) : documents[docIndex].references,
      figures: updateDocument.figures ? updateDocument.figures.map((fig: any) => ({
        ...fig,
        id: fig.id || `fig-${Date.now()}-${Math.random()}`,
        caption: fig.caption || '',
        order: fig.order || 0
      })) : documents[docIndex].figures,
      settings: updateDocument.settings ? {
        fontSize: updateDocument.settings.fontSize || '12pt',
        columns: updateDocument.settings.columns || '1',
        exportFormat: updateDocument.settings.exportFormat || 'docx' as const,
        includePageNumbers: updateDocument.settings.includePageNumbers ?? true,
        includeCopyright: updateDocument.settings.includeCopyright ?? true
      } : documents[docIndex].settings,
      iteration: updateDocument.iteration ? {
        version: updateDocument.iteration.version || 1,
        history: updateDocument.iteration.history ? updateDocument.iteration.history.map((item: any) => ({
          type: item.type || 'update',
          version: item.version || 1,
          timestamp: item.timestamp || new Date().toISOString(),
          feedback: item.feedback || '',
          changes: item.changes || []
        })) : [],
        lastModified: updateDocument.iteration.lastModified || new Date().toISOString()
      } : documents[docIndex].iteration
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