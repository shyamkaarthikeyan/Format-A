import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Document, UpdateDocument } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  abstract: z.string().optional(),
  keywords: z.string().optional(),
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
      </form>
    </Form>
  );
}
