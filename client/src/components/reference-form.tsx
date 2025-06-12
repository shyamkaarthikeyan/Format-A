import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, FileText, List } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Reference } from "@shared/schema";

interface ReferenceFormProps {
  references: Reference[];
  onUpdate: (references: Reference[]) => void;
}

export default function ReferenceForm({ references, onUpdate }: ReferenceFormProps) {
  const [bulkText, setBulkText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const addReference = () => {
    const newReference: Reference = {
      id: `reference_${Date.now()}`,
      text: "",
      order: references.length
    };
    onUpdate([...references, newReference]);
  };

  const removeReference = (referenceId: string) => {
    onUpdate(references.filter(reference => reference.id !== referenceId));
  };

  const updateReference = (referenceId: string, text: string) => {
    onUpdate(references.map(reference => 
      reference.id === referenceId ? { ...reference, text } : reference
    ));
  };

  const processBulkReferences = () => {
    if (!bulkText.trim()) return;

    // Split by lines and filter out empty lines
    const lines = bulkText.split('\n').filter(line => line.trim());
    
    // Parse references - look for numbered references like [1], [2], etc.
    const parsedReferences: Reference[] = [];
    let currentReference = "";
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if line starts with a reference number like [1], [2], etc.
      const numberMatch = trimmedLine.match(/^\[\d+\]\s*(.*)$/);
      
      if (numberMatch) {
        // If we have a previous reference, save it
        if (currentReference.trim()) {
          parsedReferences.push({
            id: `reference_${Date.now()}_${parsedReferences.length}`,
            text: currentReference.trim(),
            order: parsedReferences.length
          });
        }
        // Start new reference
        currentReference = numberMatch[1];
      } else if (trimmedLine) {
        // Continue current reference (multi-line reference)
        currentReference += " " + trimmedLine;
      }
    }
    
    // Add the last reference if it exists
    if (currentReference.trim()) {
      parsedReferences.push({
        id: `reference_${Date.now()}_${parsedReferences.length}`,
        text: currentReference.trim(),
        order: parsedReferences.length
      });
    }

    // If no numbered references found, treat each non-empty line as a reference
    if (parsedReferences.length === 0) {
      lines.forEach((line, index) => {
        if (line.trim()) {
          parsedReferences.push({
            id: `reference_${Date.now()}_${index}`,
            text: line.trim(),
            order: index
          });
        }
      });
    }

    // Add to existing references
    const updatedReferences = [...references, ...parsedReferences];
    onUpdate(updatedReferences);
    
    // Clear the bulk text and close dialog
    setBulkText("");
    setIsDialogOpen(false);
  };

  const clearAllReferences = () => {
    onUpdate([]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>References</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Bulk Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add References in Bulk</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bulk-references">
                      Paste your references below (one per line or with numbers)
                    </Label>
                    <div className="text-sm text-gray-600 mt-1 mb-2">
                      <p><strong>Option 1:</strong> Number each reference yourself:</p>
                      <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                        [1] A. Smith, "Paper Title," Journal Name, vol. 1, pp. 1-10, 2021.<br/>
                        [2] B. Johnson, "Another Paper," Conference, pp. 20-30, 2022.
                      </p>
                      <p className="mt-2"><strong>Option 2:</strong> One reference per line (auto-numbered):</p>
                      <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                        A. Smith, "Paper Title," Journal Name, vol. 1, pp. 1-10, 2021.<br/>
                        B. Johnson, "Another Paper," Conference, pp. 20-30, 2022.
                      </p>
                    </div>
                    <Textarea
                      id="bulk-references"
                      rows={12}
                      placeholder="Paste your references here...

Example with numbering:
[1] A. Smith, &quot;Paper Title,&quot; Journal Name, vol. 1, pp. 1-10, 2021.
[2] B. Johnson, &quot;Another Paper,&quot; Conference, pp. 20-30, 2022.

Or one per line:
A. Smith, &quot;Paper Title,&quot; Journal Name, vol. 1, pp. 1-10, 2021.
B. Johnson, &quot;Another Paper,&quot; Conference, pp. 20-30, 2022."
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkText("");
                        setIsDialogOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={processBulkReferences} disabled={!bulkText.trim()}>
                      Add References
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={addReference} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add One
            </Button>
            {references.length > 0 && (
              <Button onClick={clearAllReferences} variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {references.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              <List className="w-12 h-12 mx-auto text-gray-300" />
            </div>
            <p className="text-lg font-medium">No references added yet</p>
            <p className="text-sm">Choose "Add One" for individual references or "Bulk Add" for multiple references at once</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>{references.length}</strong> reference{references.length !== 1 ? 's' : ''} added
              </p>
            </div>
            {references.map((reference, index) => (
              <Card key={reference.id} className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-md font-medium text-gray-900">[{index + 1}]</h4>
                    <Button
                      onClick={() => removeReference(reference.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    rows={3}
                    placeholder="IEEE format reference (e.g., A. Smith and B. Johnson, &quot;Title,&quot; Journal Name, vol. 1, no. 1, pp. 1-10, Jan. 2021.)"
                    value={reference.text}
                    onChange={(e) => updateReference(reference.id, e.target.value)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
