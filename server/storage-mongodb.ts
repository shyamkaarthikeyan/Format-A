import { DocumentModel } from './database.js';
import type { Document, InsertDocument, UpdateDocument } from '../shared/schema.js';

export interface IStorage {
  getDocument(id: string): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: UpdateDocument): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;
}

export class MongoStorage implements IStorage {
  async getDocument(id: string): Promise<Document | undefined> {
    try {
      const doc = await DocumentModel.findById(id).lean();
      if (!doc) return undefined;
      
      return {
        id: doc._id.toString(),
        title: doc.title || '',
        abstract: doc.abstract || null,
        keywords: doc.keywords || null,
        authors: doc.authors || [],
        sections: doc.sections || [],
        references: doc.references || [],
        figures: doc.figures || [],
        settings: doc.settings || {
          fontSize: '10pt',
          columns: '2',
          exportFormat: 'docx',
          includePageNumbers: true,
          includeCopyright: false
        }
      } as Document;
    } catch (error) {
      console.error('Error getting document:', error);
      return undefined;
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    try {
      const docs = await DocumentModel.find().lean();
      return docs.map(doc => ({
        id: doc._id.toString(),
        title: doc.title || '',
        abstract: doc.abstract || null,
        keywords: doc.keywords || null,
        authors: doc.authors || [],
        sections: doc.sections || [],
        references: doc.references || [],
        figures: doc.figures || [],
        settings: doc.settings || {
          fontSize: '10pt',
          columns: '2',
          exportFormat: 'docx',
          includePageNumbers: true,
          includeCopyright: false
        }
      })) as Document[];
    } catch (error) {
      console.error('Error getting all documents:', error);
      return [];
    }
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    try {
      const newDoc = new DocumentModel({
        title: insertDocument.title || '',
        abstract: insertDocument.abstract || null,
        keywords: insertDocument.keywords || null,
        authors: insertDocument.authors || [],
        sections: insertDocument.sections || [],
        references: insertDocument.references || [],
        figures: insertDocument.figures || [],
        settings: insertDocument.settings || {
          fontSize: '10pt',
          columns: '2',
          exportFormat: 'docx',
          includePageNumbers: true,
          includeCopyright: false
        }
      });

      const savedDoc = await newDoc.save();
      
      return {
        id: savedDoc._id.toString(),
        title: savedDoc.title || '',
        abstract: savedDoc.abstract || null,
        keywords: savedDoc.keywords || null,
        authors: savedDoc.authors || [],
        sections: savedDoc.sections || [],
        references: savedDoc.references || [],
        figures: savedDoc.figures || [],
        settings: savedDoc.settings || {
          fontSize: '10pt',
          columns: '2',
          exportFormat: 'docx',
          includePageNumbers: true,
          includeCopyright: false
        }
      } as Document;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async updateDocument(id: string, updateDocument: UpdateDocument): Promise<Document | undefined> {
    try {
      const updatedDoc = await DocumentModel.findByIdAndUpdate(
        id,
        { $set: updateDocument },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedDoc) return undefined;

      return {
        id: updatedDoc._id.toString(),
        title: updatedDoc.title || '',
        abstract: updatedDoc.abstract || null,
        keywords: updatedDoc.keywords || null,
        authors: updatedDoc.authors || [],
        sections: updatedDoc.sections || [],
        references: updatedDoc.references || [],
        figures: updatedDoc.figures || [],
        settings: updatedDoc.settings || {
          fontSize: '10pt',
          columns: '2',
          exportFormat: 'docx',
          includePageNumbers: true,
          includeCopyright: false
        }
      } as Document;
    } catch (error) {
      console.error('Error updating document:', error);
      return undefined;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      const result = await DocumentModel.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }
}

export const storage = new MongoStorage();