import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File, base64: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  currentFile?: {
    name: string;
    preview?: string;
  };
}

export default function FileUpload({ 
  onFileSelect, 
  accept = "*/*", 
  maxSize = 5 * 1024 * 1024,
  currentFile
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (file.size > maxSize) {
      alert(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onFileSelect(file, base64);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // In a real implementation, you might want to call a callback to clear the file
  };

  if (currentFile) {
    return (
      <div className="border-2 border-gray-300 border-dashed rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {currentFile.preview ? (
              <img 
                src={currentFile.preview} 
                alt="Preview" 
                className="w-12 h-12 object-cover rounded"
              />
            ) : (
              <FileText className="w-8 h-8 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{currentFile.name}</p>
              <p className="text-xs text-gray-500">Click to change file</p>
            </div>
          </div>
          <Button
            onClick={clearFile}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileInputChange}
        />
        <div 
          className="mt-2 cursor-pointer"
          onClick={handleClick}
        >
          <p className="text-xs text-blue-600 hover:text-blue-800">Click to change</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragOver
          ? "border-blue-400 bg-blue-50"
          : "border-gray-300 hover:border-blue-400"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleFileInputChange}
      />
      
      {isUploading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      ) : (
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      )}
      
      <div className="text-sm text-gray-600">
        <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {accept.includes("image") ? "PNG, JPG, PDF" : "All files"} up to {Math.round(maxSize / 1024 / 1024)}MB
      </div>
    </div>
  );
}
