import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip, convertMillimetersToTwip } from 'docx';

interface Author {
  name: string;
  department?: string;
  organization?: string;
  city?: string;
  state?: string;
  email?: string;
  custom_fields?: Array<{ label: string; value: string }>;
}

interface ContentBlock {
  type: 'text' | 'image';
  content?: string;
  data?: string;
  caption?: string;
  size?: string;
}

interface Section {
  title: string;
  content?: string;
  contentBlocks?: ContentBlock[];
  content_blocks?: ContentBlock[];
  subsections?: Array<{
    id: string;
    title: string;
    content: string;
    level?: number;
    parentId?: string;
  }>;
}

interface DocumentData {
  title: string;
  authors?: Author[];
  abstract?: string;
  keywords?: string;
  sections?: Section[];
  references?: Array<{ text: string }>;
}

export class IEEEDocumentGenerator {
  private static readonly FONT_SIZE = 19; // 9.5pt in half-points
  private static readonly TITLE_FONT_SIZE = 48; // 24pt in half-points
  private static readonly MARGIN = convertInchesToTwip(0.75);

  public static async generateDocument(documentData: DocumentData): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: this.MARGIN,
              right: this.MARGIN,
              bottom: this.MARGIN,
              left: this.MARGIN,
            },
          },
        },
        children: [
          ...this.createTitle(documentData.title),
          ...this.createAuthors(documentData.authors || []),
          ...this.createAbstract(documentData.abstract),
          ...this.createKeywords(documentData.keywords),
          ...this.createSections(documentData.sections || []),
          ...this.createReferences(documentData.references || []),
        ],
      }],
    });

    return await Packer.toBuffer(doc);
  }

  private static createTitle(title: string): Paragraph[] {
    if (!title) return [];

    return [
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: this.TITLE_FONT_SIZE,
            font: 'Times New Roman',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 240, // 12pt
        },
      }),
    ];
  }

  private static createAuthors(authors: Author[]): Paragraph[] {
    if (!authors.length) return [];

    const authorParagraphs: Paragraph[] = [];

    authors.forEach((author, index) => {
      if (!author.name) return;

      // Author name
      authorParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: author.name,
              bold: true,
              size: this.FONT_SIZE,
              font: 'Times New Roman',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 40, // 2pt
          },
        })
      );

      // Author details
      const details: string[] = [];
      if (author.department) details.push(author.department);
      if (author.organization) details.push(author.organization);
      if (author.city) details.push(author.city);
      if (author.state) details.push(author.state);

      details.forEach(detail => {
        authorParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: detail,
                italics: true,
                size: this.FONT_SIZE,
                font: 'Times New Roman',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 40, // 2pt
            },
          })
        );
      });

      // Custom fields
      if (author.custom_fields) {
        author.custom_fields.forEach(field => {
          if (field.value) {
            authorParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: field.value,
                    italics: true,
                    size: this.FONT_SIZE,
                    font: 'Times New Roman',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: {
                  after: 40, // 2pt
                },
              })
            );
          }
        });
      }
    });

    // Add spacing after authors
    authorParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { after: 240 }, // 12pt
      })
    );

    return authorParagraphs;
  }

  private static createAbstract(abstract?: string): Paragraph[] {
    if (!abstract) return [];

    return [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Abstract—',
            bold: true,
            size: this.FONT_SIZE,
            font: 'Times New Roman',
          }),
          new TextRun({
            text: abstract,
            bold: true,
            size: this.FONT_SIZE,
            font: 'Times New Roman',
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: {
          after: 200, // 10pt
        },
      }),
    ];
  }

  private static createKeywords(keywords?: string): Paragraph[] {
    if (!keywords) return [];

    return [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Keywords—',
            bold: true,
            size: this.FONT_SIZE,
            font: 'Times New Roman',
          }),
          new TextRun({
            text: keywords,
            bold: true,
            size: this.FONT_SIZE,
            font: 'Times New Roman',
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: {
          after: 200, // 10pt
        },
      }),
    ];
  }

  private static createSections(sections: Section[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    sections.forEach((section, index) => {
      if (section.title) {
        // Section heading
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${section.title.toUpperCase()}`,
                size: this.FONT_SIZE,
                font: 'Times New Roman',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200, // 10pt
              after: 0,
            },
          })
        );
      }

      // Section content
      const contentBlocks = section.contentBlocks || section.content_blocks || [];
      
      if (contentBlocks.length > 0) {
        contentBlocks.forEach(block => {
          if (block.type === 'text' && block.content) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: block.content,
                    size: this.FONT_SIZE,
                    font: 'Times New Roman',
                  }),
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: {
                  before: 60, // 3pt
                  after: 240, // 12pt
                },
                indent: {
                  left: convertInchesToTwip(0.2),
                  right: convertInchesToTwip(0.2),
                },
              })
            );
          }
          // Note: Image handling would require additional implementation
        });
      } else if (section.content) {
        // Legacy content field
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.content,
                size: this.FONT_SIZE,
                font: 'Times New Roman',
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              before: 60, // 3pt
              after: 240, // 12pt
            },
            indent: {
              left: convertInchesToTwip(0.2),
              right: convertInchesToTwip(0.2),
            },
          })
        );
      }

      // Handle subsections
      if (section.subsections) {
        const level1Subsections = section.subsections.filter(s => s.level === 1 || !s.level);
        
        level1Subsections.forEach((subsection, subIndex) => {
          if (subsection.title) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${index + 1}.${subIndex + 1} ${subsection.title}`,
                    size: this.FONT_SIZE,
                    font: 'Times New Roman',
                  }),
                ],
                alignment: AlignmentType.LEFT,
                spacing: {
                  before: 200, // 10pt
                  after: 0,
                },
              })
            );
          }

          if (subsection.content) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: subsection.content,
                    size: this.FONT_SIZE,
                    font: 'Times New Roman',
                  }),
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: {
                  before: 20, // 1pt
                  after: 240, // 12pt
                },
                indent: {
                  left: convertInchesToTwip(0.2),
                  right: convertInchesToTwip(0.2),
                },
              })
            );
          }
        });
      }
    });

    return paragraphs;
  }

  private static createReferences(references: Array<{ text: string }>): Paragraph[] {
    if (!references.length) return [];

    const paragraphs: Paragraph[] = [];

    // References heading
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'REFERENCES',
            size: this.FONT_SIZE,
            font: 'Times New Roman',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 400, // 20pt
          after: 240, // 12pt
        },
      })
    );

    // Reference list
    references.forEach((reference, index) => {
      if (reference.text) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[${index + 1}] ${reference.text}`,
                size: this.FONT_SIZE,
                font: 'Times New Roman',
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: {
              after: 120, // 6pt
            },
            indent: {
              left: convertInchesToTwip(0.25),
              hanging: convertInchesToTwip(0.25),
            },
          })
        );
      }
    });

    return paragraphs;
  }
}