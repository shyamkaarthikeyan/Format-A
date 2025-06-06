import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Document, UpdateDocument } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  abstract: z.string().optional(),
  keywords: z.string().optional(),
  receivedDate: z.string().optional(),
  revisedDate: z.string().optional(),
  acceptedDate: z.string().optional(),
  funding: z.string().optional(),
  doi: z.string().optional(),
  acknowledgments: z.string().optional(),
});

// Abstract validation function matching Streamlit
function validateAbstract(abstract: string): boolean {
  if (!abstract) return true;
  const wordCount = abstract.trim().split(/\s+/).length;
  return wordCount >= 150 && wordCount <= 250;
}

function getWordCount(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

interface DocumentFormProps {
  document: Document;
  onUpdate: (data: UpdateDocument) => void;
}

export default function DocumentForm({ document, onUpdate }: DocumentFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: document.title || "",
      abstract: document.abstract || "",
      keywords: document.keywords || "",
      receivedDate: document.receivedDate || "",
      revisedDate: document.revisedDate || "",
      acceptedDate: document.acceptedDate || "",
      funding: document.funding || "",
      doi: document.doi || "",
      acknowledgments: document.acknowledgments || "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onUpdate(values);
  };

  // Auto-save on input change
  const handleInputChange = (field: string, value: string) => {
    form.setValue(field as any, value);
    const currentValues = form.getValues();
    onUpdate({ [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Metadata</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paper Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your paper title"
                        {...field}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the paper title (10–12 words recommended).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="abstract"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abstract</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={6}
                        placeholder="Summarize the paper's purpose, methods, results, and conclusions"
                        {...field}
                        onChange={(e) => handleInputChange("abstract", e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      Summarize the paper's purpose, methods, results, and conclusions.
                    </FormDescription>
                    {field.value && !validateAbstract(field.value) && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Abstract is recommended to be 150–250 words. Current: {getWordCount(field.value)} words.
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., machine learning, IEEE, research (3–5 keywords)"
                        {...field}
                        onChange={(e) => handleInputChange("keywords", e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      e.g., machine learning, IEEE, research (3–5 keywords).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Footnote Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Footnote Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="receivedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manuscript Received Date</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., April 27, 2025"
                          {...field}
                          onChange={(e) => handleInputChange("receivedDate", e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>e.g., April 27, 2025</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="revisedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manuscript Revised Date</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., September 18, 2025"
                          {...field}
                          onChange={(e) => handleInputChange("revisedDate", e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>e.g., September 18, 2025</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="acceptedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manuscript Accepted Date</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., July 25, 2025"
                          {...field}
                          onChange={(e) => handleInputChange("acceptedDate", e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>e.g., July 25, 2025</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="funding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funding Information</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., National Science Foundation Grant XYZ"
                          {...field}
                          onChange={(e) => handleInputChange("funding", e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>e.g., National Science Foundation Grant XYZ</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="doi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DOI</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 10.1109/EXAMPLE.2025.123456"
                          {...field}
                          onChange={(e) => handleInputChange("doi", e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>e.g., 10.1109/EXAMPLE.2025.123456</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Acknowledgments Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Additional Sections</h3>
              
              <FormField
                control={form.control}
                name="acknowledgments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acknowledgments</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Acknowledge funding or contributors"
                        {...field}
                        onChange={(e) => handleInputChange("acknowledgments", e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      Acknowledge funding or contributors.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
