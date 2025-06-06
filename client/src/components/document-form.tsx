import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
});

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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="receivedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        onChange={(e) => handleInputChange("receivedDate", e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="revisedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revised Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        onChange={(e) => handleInputChange("revisedDate", e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="abstract"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abstract</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="Enter the abstract for your paper"
                      {...field}
                      onChange={(e) => handleInputChange("abstract", e.target.value)}
                    />
                  </FormControl>
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
                      placeholder="machine learning, image recognition, neural networks"
                      {...field}
                      onChange={(e) => handleInputChange("keywords", e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="funding"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funding Source</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Grant number or funding source"
                        {...field}
                        onChange={(e) => handleInputChange("funding", e.target.value)}
                      />
                    </FormControl>
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
                        placeholder="10.1109/..."
                        {...field}
                        onChange={(e) => handleInputChange("doi", e.target.value)}
                      />
                    </FormControl>
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
