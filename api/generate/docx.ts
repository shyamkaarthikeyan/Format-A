import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ImageRun, SectionType } from 'docx';
import { NextApiRequest, NextApiResponse } from 'next';

interface Author {
  id?: string;
  name: string;
  department?: string;
  organization?: string;
  city?: string;
  state?: string;
  customFields?: { value: string }[];
}

interface ContentBlock {
  type: 'text' | 'image';
  content?: string;
  data?: string;
  caption?: string;
  size?: 'very-small' | 'small' | 'medium' | 'large';
}

interface Section {
  title: string;
  contentBlocks?: ContentBlock[];
  content?: string;
  subsections?: { title: string; content: string }[];
}

interface Reference {
  text: string;
}

interface DocumentData {
  title: string;
  authors: Author[];
  abstract?: string;
  keywords?: string;
  sections?: Section[];
  references?: Reference[];
}

function createIEEEDocument(data: DocumentData): Document {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080, // 0.75 inch in twips
              right: 1080,
              bottom: 1080,
              left: 1080,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            text: data.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            run: {
              font: "Times New Roman",
              size: 48, // 24pt
              bold: true,
            },
          }),

          // Authors table
          ...(data.authors && data.authors.length > 0 
            ? [createAuthorsTable(data.authors)]
            : []
          ),

          // Abstract
          ...(data.abstract 
            ? [new Paragraph({
                children: [
                  new TextRun({
                    text: "Abstract—",
                    font: "Times New Roman",
                    size: 19, // 9.5pt
                    italics: true,
                  }),
                  new TextRun({
                    text: data.abstract,
                    font: "Times New Roman",
                    size: 19,
                  }),
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 240 },
              })]
            : []
          ),

          // Keywords
          ...(data.keywords 
            ? [new Paragraph({
                children: [
                  new TextRun({
                    text: "Index Terms—",
                    font: "Times New Roman",
                    size: 19,
                    italics: true,
                  }),
                  new TextRun({
                    text: data.keywords,
                    font: "Times New Roman",
                    size: 19,
                  }),
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 240 },
              })]
            : []
          ),
        ],
      },
      // Two-column section for body content
      {
        properties: {
          type: SectionType.CONTINUOUS,
          column: {
            count: 2,
            space: 360, // 0.25 inch spacing
            equalWidth: true,
          },
          page: {
            margin: {
              top: 1080,
              right: 1080,
              bottom: 1080,
              left: 1080,
            },
          },
        },
        children: [
          // Sections content
          ...(data.sections ? createSections(data.sections) : []),
          
          // References
          ...(data.references && data.references.length > 0 
            ? createReferences(data.references)
            : []
          ),
        ],
      },
    ],
  });

  return doc;
}

function createAuthorsTable(authors: Author[]): Table {
  const cells = authors.map((author) => {
    const content = [
      new Paragraph({
        text: author.name,
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        run: {
          font: "Times New Roman",
          size: 19,
          bold: true,
        },
      }),
    ];

    // Add author details
    [author.department, author.organization, author.city, author.state].forEach(field => {
      if (field) {
        content.push(new Paragraph({
          text: field,
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          run: {
            font: "Times New Roman",
            size: 19,
            italics: true,
          },
        }));
      }
    });

    // Add custom fields
    author.customFields?.forEach(field => {
      if (field.value) {
        content.push(new Paragraph({
          text: field.value,
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          run: {
            font: "Times New Roman",
            size: 19,
            italics: true,
          },
        }));
      }
    });

    return new TableCell({
      children: content,
      width: { size: 100 / authors.length, type: WidthType.PERCENTAGE },
    });
  });

  return new Table({
    rows: [new TableRow({ children: cells })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { bottom: 240 },
  });
}

function createSections(sections: Section[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  sections.forEach((section, index) => {
    const sectionNumber = index + 1;

    // Section title
    if (section.title) {
      paragraphs.push(new Paragraph({
        text: `${sectionNumber}. ${section.title.toUpperCase()}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 120 },
        run: {
          font: "Times New Roman",
          size: 19,
          bold: true,
        },
      }));
    }

    // Content blocks
    if (section.contentBlocks) {
      section.contentBlocks.forEach((block) => {
        if (block.type === 'text' && block.content) {
          paragraphs.push(new Paragraph({
            text: stripHtml(block.content),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 240 },
            run: {
              font: "Times New Roman",
              size: 19,
            },
          }));
        }
        
        if (block.type === 'image' && block.data && block.caption) {
          // Note: Image handling would require more complex base64 processing
          // For now, add a placeholder
          paragraphs.push(new Paragraph({
            text: `[Figure: ${block.caption}]`,
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
            run: {
              font: "Times New Roman",
              size: 18,
              italics: true,
            },
          }));
        }
      });
    }

    // Legacy content field
    if (!section.contentBlocks && section.content) {
      paragraphs.push(new Paragraph({
        text: section.content,
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 240 },
        run: {
          font: "Times New Roman",
          size: 19,
        },
      }));
    }

    // Subsections
    if (section.subsections) {
      section.subsections.forEach((subsection, subIndex) => {
        if (subsection.title) {
          paragraphs.push(new Paragraph({
            text: `${sectionNumber}.${subIndex + 1} ${subsection.title}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 120, after: 80 },
            run: {
              font: "Times New Roman",
              size: 19,
              bold: true,
            },
          }));
        }

        if (subsection.content) {
          paragraphs.push(new Paragraph({
            text: subsection.content,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 240 },
            run: {
              font: "Times New Roman",
              size: 19,
            },
          }));
        }
      });
    }
  });

  return paragraphs;
}

function createReferences(references: Reference[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // References heading
  paragraphs.push(new Paragraph({
    text: "REFERENCES",
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 120 },
    run: {
      font: "Times New Roman",
      size: 19,
      bold: true,
    },
  }));

  // Reference entries
  references.forEach((ref, index) => {
    if (ref.text) {
      paragraphs.push(new Paragraph({
        text: `[${index + 1}] ${ref.text}`,
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
        indent: {
          left: 360, // 0.25 inch
          hanging: 360,
        },
        run: {
          font: "Times New Roman",
          size: 19,
        },
      }));
    }
  });

  return paragraphs;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const documentData: DocumentData = req.body;
    
    if (!documentData.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    if (!documentData.authors || !documentData.authors.some(author => author.name)) {
      return res.status(400).json({ error: 'At least one author name is required' });
    }

    // Generate the document
    const doc = createIEEEDocument(documentData);
    
    // Convert to buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
    res.setHeader('Content-Length', buffer.length.toString());
    
    // Send the file
    res.send(buffer);

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: (error as Error).message
    });
  }
}