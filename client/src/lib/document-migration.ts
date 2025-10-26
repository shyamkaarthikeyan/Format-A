/**
 * Document Migration Service
 * Handles migration of guest documents to authenticated user accounts
 */

interface GuestDocument {
  title: string;
  blocks: any[];
  lastModified: string;
  version: number;
}

interface DocumentPreview {
  title: string;
  lastModified: string;
}

class DocumentMigrationService {
  private static readonly GUEST_DOCUMENT_KEY = 'guest-document';
  private static readonly MIGRATION_BACKUP_KEY = 'guest-document-backup';

  /**
   * Check if a guest document exists in localStorage
   */
  static hasGuestDocument(): boolean {
    try {
      const guestDoc = localStorage.getItem(this.GUEST_DOCUMENT_KEY);
      return !!guestDoc;
    } catch (error) {
      console.error('Error checking for guest document:', error);
      return false;
    }
  }

  /**
   * Get guest document data
   */
  static getGuestDocument(): GuestDocument | null {
    try {
      const guestDoc = localStorage.getItem(this.GUEST_DOCUMENT_KEY);
      if (!guestDoc) return null;
      
      return JSON.parse(guestDoc);
    } catch (error) {
      console.error('Error parsing guest document:', error);
      return null;
    }
  }

  /**
   * Get a preview of the guest document
   */
  static getGuestDocumentPreview(): DocumentPreview | null {
    const doc = this.getGuestDocument();
    if (!doc) return null;

    return {
      title: doc.title || 'Untitled Document',
      lastModified: doc.lastModified
    };
  }

  /**
   * Preserve guest document by creating a backup
   */
  static preserveGuestDocument(): string | null {
    try {
      const guestDoc = localStorage.getItem(this.GUEST_DOCUMENT_KEY);
      if (!guestDoc) return null;

      // Create backup
      const backupKey = `${this.MIGRATION_BACKUP_KEY}-${Date.now()}`;
      localStorage.setItem(backupKey, guestDoc);
      
      return backupKey;
    } catch (error) {
      console.error('Error preserving guest document:', error);
      return null;
    }
  }

  /**
   * Migrate guest document to user account
   */
  static async migrateGuestDocument(userId: string): Promise<boolean> {
    try {
      const guestDoc = this.getGuestDocument();
      if (!guestDoc) return false;

      // Convert guest document to user document format
      const userDocument = {
        userId,
        title: guestDoc.title || 'Migrated Document',
        content: JSON.stringify(guestDoc.blocks),
        metadata: {
          migratedFrom: 'guest',
          originalLastModified: guestDoc.lastModified,
          migrationDate: new Date().toISOString()
        }
      };

      // Send to server for storage
      const response = await fetch('/api/documents/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userDocument)
      });

      if (response.ok) {
        // Migration successful, create backup and clear guest document
        this.preserveGuestDocument();
        this.clearGuestDocument();
        return true;
      } else {
        console.error('Server error during migration:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error migrating guest document:', error);
      return false;
    }
  }

  /**
   * Auto-migrate guest document when user signs in
   */
  static async autoMigrateOnSignIn(userId: string): Promise<boolean> {
    if (!this.hasGuestDocument()) return true;

    try {
      const success = await this.migrateGuestDocument(userId);
      if (success) {
        console.log('Guest document successfully migrated to user account');
      } else {
        console.warn('Failed to migrate guest document, keeping in localStorage');
      }
      return success;
    } catch (error) {
      console.error('Auto-migration failed:', error);
      return false;
    }
  }

  /**
   * Clear guest document from localStorage
   */
  static clearGuestDocument(): void {
    try {
      localStorage.removeItem(this.GUEST_DOCUMENT_KEY);
    } catch (error) {
      console.error('Error clearing guest document:', error);
    }
  }

  /**
   * Restore guest document from backup
   */
  static restoreFromBackup(backupKey: string): boolean {
    try {
      const backup = localStorage.getItem(backupKey);
      if (!backup) return false;

      localStorage.setItem(this.GUEST_DOCUMENT_KEY, backup);
      localStorage.removeItem(backupKey);
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }

  /**
   * Clean up old migration backups (older than 7 days)
   */
  static cleanupOldBackups(): void {
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.MIGRATION_BACKUP_KEY)) {
          const timestamp = parseInt(key.split('-').pop() || '0');
          if (timestamp < sevenDaysAgo) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }
}

export default DocumentMigrationService;