import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import type { Reference } from "@shared/schema";

interface ReferenceFormProps {
  references: Reference[];
  onUpdate: (references: Reference[]) => void;
}

export default function ReferenceForm({ references, onUpdate }: ReferenceFormProps) {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>References</CardTitle>
          <Button onClick={addReference} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Reference
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {references.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No references added yet. Click "Add Reference" to get started.</p>
          </div>
        ) : (
          references.map((reference, index) => (
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
