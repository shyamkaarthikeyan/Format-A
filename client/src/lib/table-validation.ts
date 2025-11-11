/**
 * Table validation utilities to ensure data consistency between frontend and backend
 */

import type { Table, ContentBlock, Document } from "@shared/schema";

export interface TableValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a standalone table from TableForm
 */
export function validateStandaloneTable(table: Table): TableValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!table.id) {
    errors.push("Table ID is missing");
  }

  if (!table.tableName && !table.caption) {
    warnings.push("Table has no name or caption");
  }

  // Validate table type consistency
  if (table.type !== table.tableType) {
    errors.push(`Table type mismatch: type="${table.type}" but tableType="${table.tableType}"`);
  }

  // Validate based on table type
  switch (table.type) {
    case 'interactive':
      if (!table.headers || table.headers.length === 0) {
        errors.push("Interactive table missing headers");
      }
      
      if (!table.tableData || table.tableData.length === 0) {
        errors.push("Interactive table missing data");
      }
      
      if (table.headers && table.tableData) {
        // Check data consistency
        const expectedColumns = table.headers.length;
        table.tableData.forEach((row, rowIndex) => {
          if (row.length !== expectedColumns) {
            errors.push(`Row ${rowIndex + 1} has ${row.length} columns, expected ${expectedColumns}`);
          }
        });
      }
      
      if (table.rows && table.tableData && table.rows !== table.tableData.length) {
        warnings.push(`Row count mismatch: rows=${table.rows} but data has ${table.tableData.length} rows`);
      }
      
      if (table.columns && table.headers && table.columns !== table.headers.length) {
        warnings.push(`Column count mismatch: columns=${table.columns} but headers has ${table.headers.length} columns`);
      }
      break;

    case 'image':
      if (!table.data) {
        errors.push("Image table missing image data");
      }
      
      if (!table.mimeType) {
        warnings.push("Image table missing MIME type");
      }
      break;

    case 'latex':
      if (!table.latexCode) {
        errors.push("LaTeX table missing LaTeX code");
      }
      break;

    default:
      errors.push(`Unknown table type: ${table.type}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a content block table from section content blocks
 */
export function validateContentBlockTable(block: ContentBlock): TableValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (block.type !== 'table') {
    errors.push("Content block is not a table type");
    return { isValid: false, errors, warnings };
  }

  // Check table type consistency
  const tableType = (block as any).tableType;
  if (!tableType) {
    errors.push("Content block table missing tableType");
  }

  // Validate based on table type
  switch (tableType) {
    case 'interactive':
      const headers = (block as any).headers;
      const tableData = (block as any).tableData;
      
      if (!headers || headers.length === 0) {
        errors.push("Interactive content block table missing headers");
      }
      
      if (!tableData || tableData.length === 0) {
        errors.push("Interactive content block table missing data");
      }
      
      if (headers && tableData) {
        // Check data consistency
        const expectedColumns = headers.length;
        tableData.forEach((row: string[], rowIndex: number) => {
          if (row.length !== expectedColumns) {
            errors.push(`Content block table row ${rowIndex + 1} has ${row.length} columns, expected ${expectedColumns}`);
          }
        });
      }
      break;

    case 'image':
      if (!(block as any).data) {
        errors.push("Image content block table missing image data");
      }
      break;

    case 'latex':
      if (!(block as any).latexCode) {
        errors.push("LaTeX content block table missing LaTeX code");
      }
      break;

    default:
      errors.push(`Unknown content block table type: ${tableType}`);
  }

  if (!block.tableName && !block.caption) {
    warnings.push("Content block table has no name or caption");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate all tables in a document
 */
export function validateDocumentTables(document: Document): TableValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate standalone tables
  if (document.tables) {
    document.tables.forEach((table, index) => {
      const result = validateStandaloneTable(table);
      if (!result.isValid) {
        allErrors.push(`Standalone table ${index + 1}: ${result.errors.join(', ')}`);
      }
      if (result.warnings.length > 0) {
        allWarnings.push(`Standalone table ${index + 1}: ${result.warnings.join(', ')}`);
      }
    });
  }

  // Validate content block tables
  document.sections.forEach((section, sectionIndex) => {
    section.contentBlocks.forEach((block, blockIndex) => {
      if (block.type === 'table') {
        const result = validateContentBlockTable(block);
        if (!result.isValid) {
          allErrors.push(`Section ${sectionIndex + 1}, block ${blockIndex + 1}: ${result.errors.join(', ')}`);
        }
        if (result.warnings.length > 0) {
          allWarnings.push(`Section ${sectionIndex + 1}, block ${blockIndex + 1}: ${result.warnings.join(', ')}`);
        }
      }
    });
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Fix common table data issues automatically
 */
export function sanitizeDocumentTables(document: Document): Document {
  const sanitizedDocument = { ...document };

  // Fix standalone tables
  if (sanitizedDocument.tables) {
    sanitizedDocument.tables = sanitizedDocument.tables.map(table => {
      const sanitizedTable = { ...table };
      
      // Ensure type and tableType are synchronized
      if (sanitizedTable.type && !sanitizedTable.tableType) {
        sanitizedTable.tableType = sanitizedTable.type;
      } else if (sanitizedTable.tableType && !sanitizedTable.type) {
        sanitizedTable.type = sanitizedTable.tableType;
      }
      
      // Fix interactive table data consistency
      if (sanitizedTable.type === 'interactive') {
        if (sanitizedTable.headers && sanitizedTable.tableData) {
          const expectedColumns = sanitizedTable.headers.length;
          
          // Fix row lengths
          sanitizedTable.tableData = sanitizedTable.tableData.map(row => {
            if (row.length < expectedColumns) {
              // Pad short rows
              return [...row, ...Array(expectedColumns - row.length).fill('')];
            } else if (row.length > expectedColumns) {
              // Truncate long rows
              return row.slice(0, expectedColumns);
            }
            return row;
          });
          
          // Update dimensions
          sanitizedTable.rows = sanitizedTable.tableData.length;
          sanitizedTable.columns = sanitizedTable.headers.length;
        }
      }
      
      return sanitizedTable;
    });
  }

  // Fix content block tables
  sanitizedDocument.sections = sanitizedDocument.sections.map(section => ({
    ...section,
    contentBlocks: section.contentBlocks.map(block => {
      if (block.type === 'table') {
        const sanitizedBlock = { ...block } as any;
        
        // Fix interactive content block table data consistency
        if (sanitizedBlock.tableType === 'interactive') {
          if (sanitizedBlock.headers && sanitizedBlock.tableData) {
            const expectedColumns = sanitizedBlock.headers.length;
            
            // Fix row lengths
            sanitizedBlock.tableData = sanitizedBlock.tableData.map((row: string[]) => {
              if (row.length < expectedColumns) {
                // Pad short rows
                return [...row, ...Array(expectedColumns - row.length).fill('')];
              } else if (row.length > expectedColumns) {
                // Truncate long rows
                return row.slice(0, expectedColumns);
              }
              return row;
            });
            
            // Update dimensions
            sanitizedBlock.rows = sanitizedBlock.tableData.length;
            sanitizedBlock.columns = sanitizedBlock.headers.length;
          }
        }
        
        return sanitizedBlock;
      }
      return block;
    })
  }));

  return sanitizedDocument;
}