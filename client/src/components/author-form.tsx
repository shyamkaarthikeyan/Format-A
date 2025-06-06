import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, X } from "lucide-react";
import type { Author, CustomField } from "@shared/schema";

interface AuthorFormProps {
  authors: Author[];
  onUpdate: (authors: Author[]) => void;
}

export default function AuthorForm({ authors, onUpdate }: AuthorFormProps) {
  const addAuthor = () => {
    const newAuthor: Author = {
      id: `author_${Date.now()}`,
      name: "",
      department: "",
      organization: "",
      city: "",
      state: "",
      email: "",
      customFields: []
    };
    onUpdate([...authors, newAuthor]);
  };

  const removeAuthor = (authorId: string) => {
    onUpdate(authors.filter(author => author.id !== authorId));
  };

  const updateAuthor = (authorId: string, field: keyof Author, value: any) => {
    onUpdate(authors.map(author => 
      author.id === authorId ? { ...author, [field]: value } : author
    ));
  };

  const addCustomField = (authorId: string) => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      name: "",
      value: ""
    };
    updateAuthor(authorId, "customFields", [
      ...authors.find(a => a.id === authorId)?.customFields || [],
      newField
    ]);
  };

  const removeCustomField = (authorId: string, fieldId: string) => {
    const author = authors.find(a => a.id === authorId);
    if (author) {
      updateAuthor(authorId, "customFields", 
        author.customFields.filter(f => f.id !== fieldId)
      );
    }
  };

  const updateCustomField = (authorId: string, fieldId: string, field: keyof CustomField, value: string) => {
    const author = authors.find(a => a.id === authorId);
    if (author) {
      updateAuthor(authorId, "customFields",
        author.customFields.map(f => 
          f.id === fieldId ? { ...f, [field]: value } : f
        )
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Authors</CardTitle>
          <Button onClick={addAuthor} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Author
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {authors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No authors added yet. Click "Add Author" to get started.</p>
          </div>
        ) : (
          authors.map((author, index) => (
            <Card key={author.id} className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-md font-medium text-gray-900">Author {index + 1}</h4>
                  <Button
                    onClick={() => removeAuthor(author.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={author.name}
                      onChange={(e) => updateAuthor(author.id, "name", e.target.value)}
                      placeholder="Author Name"
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={author.department || ""}
                      onChange={(e) => updateAuthor(author.id, "department", e.target.value)}
                      placeholder="Department"
                    />
                  </div>
                  <div>
                    <Label>Organization</Label>
                    <Input
                      value={author.organization || ""}
                      onChange={(e) => updateAuthor(author.id, "organization", e.target.value)}
                      placeholder="Organization"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={author.email || ""}
                      onChange={(e) => updateAuthor(author.id, "email", e.target.value)}
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={author.city || ""}
                      onChange={(e) => updateAuthor(author.id, "city", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={author.state || ""}
                      onChange={(e) => updateAuthor(author.id, "state", e.target.value)}
                      placeholder="State"
                    />
                  </div>
                </div>

                {/* Custom Fields */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700">Custom Fields</span>
                    <Button
                      onClick={() => addCustomField(author.id)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {author.customFields.map((field) => (
                      <div key={field.id} className="flex gap-2">
                        <Input
                          placeholder="Field name"
                          value={field.name}
                          onChange={(e) => updateCustomField(author.id, field.id, "name", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Field value"
                          value={field.value}
                          onChange={(e) => updateCustomField(author.id, field.id, "value", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => removeCustomField(author.id, field.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
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
