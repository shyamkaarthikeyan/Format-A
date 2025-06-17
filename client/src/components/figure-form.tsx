import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "./file-upload";
import { apiRequest } from "@/lib/queryClient";
import type { Figure, Section } from "@shared/schema";

interface FigureFormProps {
  figures: Figure[];
  documentId: string | null;
  sections: Section[];
  onUpdate: (figures: Figure[]) => void;
}

export default function FigureForm({ figures, documentId, sections, onUpdate }: FigureFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadFigureMutation = useMutation({
    mutationFn: async ({ file, caption, size, position, sectionId }: {
      file: File;
      caption: string;
      size: string;
      position: string;
      sectionId?: string;
    }) => {
      if (!documentId) throw new Error("No document ID");
      
      const formData = new FormData();
      formData.append("figure", file);
      formData.append("caption", caption);
      formData.append("size", size);
      formData.append("position", position);
      if (sectionId) formData.append("sectionId", sectionId);

      const res = await fetch(`/api/documents/${documentId}/figures`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      return await res.json();
    },
    onSuccess: (newFigure: Figure) => {
      onUpdate([...figures, newFigure]);
      toast({
        title: "Figure uploaded",
        description: "Figure has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload figure.",
        variant: "destructive",
      });
    },
  });

  const addFigure = () => {
    const newFigure: Figure = {
      id: `figure_${Date.now()}`,
      fileName: "",
      originalName: "",
      caption: "",
      size: "small", // Changed default from "medium" to "small"
      position: "here",
      order: figures.length,
      mimeType: "",
      data: ""
    };
    onUpdate([...figures, newFigure]);
  };

  const removeFigure = (figureId: string) => {
    onUpdate(figures.filter(figure => figure.id !== figureId));
  };

  const updateFigure = (figureId: string, field: keyof Figure, value: any) => {
    onUpdate(figures.map(figure => 
      figure.id === figureId ? { ...figure, [field]: value } : figure
    ));
  };

  const handleFileUpload = async (figureId: string, file: File, base64: string) => {
    // Update figure with file data
    updateFigure(figureId, "originalName", file.name);
    updateFigure(figureId, "fileName", `${figureId}.${file.name.split('.').pop()}`);
    updateFigure(figureId, "mimeType", file.type);
    updateFigure(figureId, "data", base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix

    // If we have a document ID, upload to server
    if (documentId) {
      const figure = figures.find(f => f.id === figureId);
      if (figure) {
        uploadFigureMutation.mutate({
          file,
          caption: figure.caption,
          size: figure.size,
          position: figure.position,
          sectionId: figure.sectionId
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Figures and Images</CardTitle>
          <Button onClick={addFigure} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Figure
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {figures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No figures added yet. Click "Add Figure" to get started.</p>
          </div>
        ) : (
          figures.map((figure, index) => (
            <Card key={figure.id} className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-md font-medium text-gray-900">Figure {index + 1}</h4>
                  <Button
                    onClick={() => removeFigure(figure.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <FileUpload
                      onFileSelect={(file, base64) => handleFileUpload(figure.id, file, base64)}
                      accept="image/*,application/pdf"
                      maxSize={10 * 1024 * 1024} // 10MB
                      currentFile={figure.data ? {
                        name: figure.originalName,
                        preview: `data:${figure.mimeType};base64,${figure.data}`
                      } : undefined}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Caption</Label>
                      <Textarea
                        rows={3}
                        placeholder="Figure caption"
                        value={figure.caption}
                        onChange={(e) => updateFigure(figure.id, "caption", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Size</Label>
                      <Select
                        value={figure.size}
                        onValueChange={(value) => updateFigure(figure.id, "size", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small (1.8")</SelectItem>
                          <SelectItem value="medium">Medium (2.5")</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Position</Label>
                      <Select
                        value={figure.position}
                        onValueChange={(value) => updateFigure(figure.id, "position", value)}
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
                        value={figure.sectionId || ""}
                        onValueChange={(value) => updateFigure(figure.id, "sectionId", value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No section</SelectItem>
                          {sections.map((section, index) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.title || `Section ${index + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
