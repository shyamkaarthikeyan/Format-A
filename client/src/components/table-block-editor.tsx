import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, Image, Plus, Minus } from "lucide-react";
import FileUpload from "./file-upload";
import type { ContentBlock as ContentBlockType } from "@shared/schema";

interface TableBlockEditorProps {
  block: ContentBlockType;
  onUpdate: (updates: Partial<ContentBlockType>) => void;
}

export default function TableBlockEditor({ block, onUpdate }: TableBlockEditorProps) {
  // Initialize table type from block data or default to interactive
  const [tableType, setTableType] = useState<'interactive' | 'image'>(
    (block as any).tableType || 'interactive'
  );

  // Initialize table data
  const [rows, setRows] = useState((block as any).rows || 3);
  const [columns, setColumns] = useState((block as any).columns || 3);
  const [headers, setHeaders] = useState<string[]>(
    (block as any).headers || ["Column 1", "Column 2", "Column 3"]
  );
  const [tableData, setTableData] = useState<string[][]>(
    (block as any).tableData || [
      ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"],
      ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3"]
    ]
  );

  const updateTableDimensions = (newRows: number, newColumns: number) => {
    setRows(newRows);
    setColumns(newColumns);

    // Update headers
    const newHeaders = Array.from({ length: newColumns }, (_, i) => 
      headers[i] || `Column ${i + 1}`
    );
    setHeaders(newHeaders);

    // Update table data
    const newTableData = Array.from({ length: newRows }, (_, rowIndex) => 
      Array.from({ length: newColumns }, (_, colIndex) => 
        tableData[rowIndex]?.[colIndex] || `Row ${rowIndex + 1} Col ${colIndex + 1}`
      )
    );
    setTableData(newTableData);

    // Update block
    onUpdate({
      tableType,
      rows: newRows,
      columns: newColumns,
      headers: newHeaders,
      tableData: newTableData
    });
  };

  const updateTableCell = (rowIndex: number, colIndex: number, value: string) => {
    const newTableData = [...tableData];
    if (!newTableData[rowIndex]) {
      newTableData[rowIndex] = [];
    }
    newTableData[rowIndex][colIndex] = value;
    setTableData(newTableData);
    
    onUpdate({
      tableType,
      rows,
      columns,
      headers,
      tableData: newTableData
    });
  };

  const updateTableHeader = (colIndex: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    setHeaders(newHeaders);
    
    onUpdate({
      tableType,
      rows,
      columns,
      headers: newHeaders,
      tableData
    });
  };

  const handleTableTypeChange = (newType: 'interactive' | 'image') => {
    setTableType(newType);
    onUpdate({ 
      tableType: newType
      // type remains 'table' - don't change it
    });
  };

  const generateTablePreview = () => {
    if (tableType === 'interactive' && headers && tableData) {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-50">
                {headers.map((header, colIndex) => (
                  <th key={colIndex} className="border border-gray-300 px-2 py-1 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-25"}>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border border-gray-300 px-2 py-1">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Table Name */}
      <div>
        <Label>Table Name</Label>
        <Input
          placeholder="Enter table name"
          value={block.tableName || ""}
          onChange={(e) => onUpdate({ tableName: e.target.value })}
        />
        <div className="text-xs text-gray-500 mt-1">
          Will appear as "Table 1: {block.tableName || 'Table Name'}" in both PDF and Word documents
        </div>
      </div>



      {/* Table Size */}
      <div>
        <Label>Table Size</Label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          value={block.size || "medium"}
          onChange={(e) => onUpdate({ size: e.target.value as any })}
        >
          <option value="extra-small">Extra Small (1.5")</option>
          <option value="small">Small (2.0")</option>
          <option value="medium">Medium (2.5")</option>
          <option value="large">Large (2.8")</option>
          <option value="extra-large">Extra Large (3.0")</option>
        </select>
        <div className="text-xs text-gray-500 mt-1">
          Choose table width (all sizes fit within 2-column layout)
        </div>
      </div>

      {/* Table Creation Options */}
      <Tabs value={tableType} onValueChange={handleTableTypeChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="interactive" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Create Table
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            Upload Image
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interactive" className="space-y-4">
          {/* Table dimensions */}
          <div className="flex gap-4 items-end">
            <div>
              <Label>Rows</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={rows}
                onChange={(e) => updateTableDimensions(parseInt(e.target.value) || 1, columns)}
                className="w-20"
              />
            </div>
            <div>
              <Label>Columns</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={columns}
                onChange={(e) => updateTableDimensions(rows, parseInt(e.target.value) || 1)}
                className="w-20"
              />
            </div>
          </div>

          {/* Table editor */}
          <div className="space-y-4">
            <div>
              <Label>Table Headers</Label>
              <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {headers.map((header, colIndex) => (
                  <Input
                    key={colIndex}
                    value={header}
                    onChange={(e) => updateTableHeader(colIndex, e.target.value)}
                    placeholder={`Column ${colIndex + 1}`}
                    className="text-sm"
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Table Data</Label>
              <div className="space-y-2 mt-2">
                {tableData.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                    {row.map((cell, colIndex) => (
                      <Input
                        key={colIndex}
                        value={cell}
                        onChange={(e) => updateTableCell(rowIndex, colIndex, e.target.value)}
                        placeholder={`Row ${rowIndex + 1} Col ${colIndex + 1}`}
                        className="text-sm"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Table preview */}
            <div>
              <Label>Preview</Label>
              <div className="mt-2 p-4 border rounded-lg bg-white">
                {generateTablePreview()}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="image" className="space-y-4">
          <div>
            <Label>Upload Table Image</Label>
            <FileUpload
              onFileSelect={(file, base64) => {
                onUpdate({
                  tableType: 'image',
                  imageId: `table_${Date.now()}`,
                  data: base64.split(',')[1],
                  fileName: file.name
                });
              }}
              onClear={() => {
                onUpdate({
                  imageId: undefined,
                  data: undefined,
                  fileName: undefined
                });
              }}
              accept="image/*"
              maxSize={10 * 1024 * 1024} // 10MB
              currentFile={block.imageId ? {
                name: block.fileName || "table-image",
                preview: `data:image/png;base64,${block.data}`
              } : undefined}
            />
            {block.imageId && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                ✅ Table image uploaded: {block.fileName || 'Table Image'}
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}