import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Upload, Table as TableIcon, Code, Image, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "./file-upload";
import type { Section, Table } from "@shared/schema";

interface TableFormProps {
  tables: Table[];
  documentId: string | null;
  sections: Section[];
  onUpdate: (tables: Table[]) => void;
}

export default function TableForm({ tables, documentId, sections, onUpdate }: TableFormProps) {
  const { toast } = useToast();

  const addTable = () => {
    const newTable: Table = {
      id: `table_${Date.now()}`,
      type: 'interactive',
      tableName: "",
      caption: "",
      size: "medium",
      position: "here",
      order: tables.length,
      rows: 3,
      columns: 3,
      headers: ["Column 1", "Column 2", "Column 3"],
      tableData: [
        ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"],
        ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3"]
      ]
    };
    onUpdate([...tables, newTable]);
  };

  const removeTable = (tableId: string) => {
    onUpdate(tables.filter(table => table.id !== tableId));
  };

  const updateTable = (tableId: string, field: keyof Table, value: any) => {
    onUpdate(tables.map(table => {
      if (table.id === tableId) {
        const updatedTable = { ...table, [field]: value };
        // Sync tableType with type for backend compatibility
        if (field === 'type') {
          updatedTable.tableType = value;
        }
        return updatedTable;
      }
      return table;
    }));
  };

  const handleFileUpload = async (tableId: string, file: File, base64: string) => {
    updateTable(tableId, "originalName", file.name);
    updateTable(tableId, "fileName", `${tableId}.${file.name.split('.').pop()}`);
    updateTable(tableId, "mimeType", file.type);
    updateTable(tableId, "data", base64.split(',')[1]);
    
    toast({
      title: "Table image uploaded",
      description: "Table image has been uploaded successfully.",
    });
  };

  const updateTableDimensions = (tableId: string, rows: number, columns: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    // Update headers
    const newHeaders = Array.from({ length: columns }, (_, i) => 
      table.headers?.[i] || `Column ${i + 1}`
    );

    // Update table data
    const newTableData = Array.from({ length: rows }, (_, rowIndex) => 
      Array.from({ length: columns }, (_, colIndex) => 
        table.tableData?.[rowIndex]?.[colIndex] || `Row ${rowIndex + 1} Col ${colIndex + 1}`
      )
    );

    updateTable(tableId, "rows", rows);
    updateTable(tableId, "columns", columns);
    updateTable(tableId, "headers", newHeaders);
    updateTable(tableId, "tableData", newTableData);
  };

  const updateTableCell = (tableId: string, rowIndex: number, colIndex: number, value: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || !table.tableData) return;

    const newTableData = [...table.tableData];
    if (!newTableData[rowIndex]) {
      newTableData[rowIndex] = [];
    }
    newTableData[rowIndex][colIndex] = value;
    updateTable(tableId, "tableData", newTableData);
  };

  const updateTableHeader = (tableId: string, colIndex: number, value: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || !table.headers) return;

    const newHeaders = [...table.headers];
    newHeaders[colIndex] = value;
    updateTable(tableId, "headers", newHeaders);
  };

  const generateTablePreview = (table: Table) => {
    if (table.type === 'interactive' && table.headers && table.tableData) {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-50">
                {table.headers.map((header, colIndex) => (
                  <th key={colIndex} className="border border-gray-300 px-2 py-1 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.tableData.map((row, rowIndex) => (
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Tables</CardTitle>
          <Button onClick={addTable} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Table
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {tables.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No tables added yet. Click "Add Table" to get started.</p>
          </div>
        ) : (
          tables.map((table, index) => (
            <Card key={table.id} className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-md font-medium text-gray-900">Table {index + 1}</h4>
                  <Button
                    onClick={() => removeTable(table.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Basic table info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Table Name</Label>
                    <Input
                      placeholder="Table name"
                      value={table.tableName}
                      onChange={(e) => updateTable(table.id, "tableName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Caption</Label>
                    <Input
                      placeholder="Table caption"
                      value={table.caption}
                      onChange={(e) => updateTable(table.id, "caption", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label>Size</Label>
                    <Select
                      value={table.size}
                      onValueChange={(value) => updateTable(table.id, "size", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Position</Label>
                    <Select
                      value={table.position}
                      onValueChange={(value) => updateTable(table.id, "position", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top of page</SelectItem>
                        <SelectItem value="bottom">Bottom of page</SelectItem>
                        <SelectItem value="here">Here (inline)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Associated Section</Label>
                    <Select
                      value={table.sectionId || "none"}
                      onValueChange={(value) => updateTable(table.id, "sectionId", value === "none" ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No section</SelectItem>
                        {sections.filter(section => section.id && section.id.trim() !== '').map((section, index) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.title || `Section ${index + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Table creation options */}
                <Tabs 
                  value={table.type} 
                  onValueChange={(value) => updateTable(table.id, "type", value as 'image' | 'latex' | 'interactive')}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="interactive" className="flex items-center gap-2">
                      <TableIcon className="w-4 h-4" />
                      Interactive
                    </TabsTrigger>
                    <TabsTrigger value="image" className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Image
                    </TabsTrigger>
                    <TabsTrigger value="latex" className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      LaTeX
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
                          value={table.rows || 3}
                          onChange={(e) => updateTableDimensions(table.id, parseInt(e.target.value) || 3, table.columns || 3)}
                          className="w-20"
                        />
                      </div>
                      <div>
                        <Label>Columns</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={table.columns || 3}
                          onChange={(e) => updateTableDimensions(table.id, table.rows || 3, parseInt(e.target.value) || 3)}
                          className="w-20"
                        />
                      </div>
                    </div>

                    {/* Table editor */}
                    {table.headers && table.tableData && (
                      <div className="space-y-4">
                        <div>
                          <Label>Table Headers</Label>
                          <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: `repeat(${table.columns}, 1fr)` }}>
                            {table.headers.map((header, colIndex) => (
                              <Input
                                key={colIndex}
                                value={header}
                                onChange={(e) => updateTableHeader(table.id, colIndex, e.target.value)}
                                placeholder={`Column ${colIndex + 1}`}
                                className="text-sm"
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label>Table Data</Label>
                          <div className="space-y-2 mt-2">
                            {table.tableData.map((row, rowIndex) => (
                              <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${table.columns}, 1fr)` }}>
                                {row.map((cell, colIndex) => (
                                  <Input
                                    key={colIndex}
                                    value={cell}
                                    onChange={(e) => updateTableCell(table.id, rowIndex, colIndex, e.target.value)}
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
                            {generateTablePreview(table)}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="image" className="space-y-4">
                    <div>
                      <Label>Upload Table Image</Label>
                      <FileUpload
                        onFileSelect={(file, base64) => handleFileUpload(table.id, file, base64)}
                        accept="image/*"
                        maxSize={10 * 1024 * 1024} // 10MB
                        currentFile={table.data ? {
                          name: table.originalName || "table-image",
                          preview: `data:${table.mimeType};base64,${table.data}`
                        } : undefined}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="latex" className="space-y-4">
                    <div>
                      <Label>LaTeX Table Code</Label>
                      <Textarea
                        rows={10}
                        placeholder="Enter your LaTeX table code here..."
                        value={table.latexCode || ""}
                        onChange={(e) => updateTable(table.id, "latexCode", e.target.value)}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Example: \begin{"{tabular}"}{"{|c|c|c|}"} \hline Header 1 & Header 2 & Header 3 \\ \hline Row 1 & Data & Data \\ \hline \end{"{tabular}"}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}