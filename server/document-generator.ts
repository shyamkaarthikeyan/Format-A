import { Document as DocxDocument, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, ImageRun, Packer } from "docx";
import type { Document, Author, Section, ContentBlock, Reference, Figure } from "@shared/schema";

// IEEE formatting configuration matching the Python code
const IEEE_CONFIG = {
  fontName: 'Times New Roman',
  fontSizeTitle: 24,
  fontSizeBody: 9.5,
  fontSizeCaption: 9,
  marginLeft: 54, // 0.75 inches in points
  marginRight: 54,
  marginTop: 54,
  marginBottom: 54,
  columnCount: 2,
  columnSpacing: 18, // 0.25 inches in points
  columnWidth: 243, // 3.375 inches in points
  columnIndent: 14.4, // 0.2 inches in points
  lineSpacing: 10,
  figureSizes: {
    'very-small': 86.4, // 1.2 inches in points
    'small': 129.6, // 1.8 inches
    'medium': 180, // 2.5 inches
    'large': 230.4 // 3.2 inches
  },
  maxFigureHeight: 288 // 4.0 inches
};

export async function generateIEEEDocx(document: Document): Promise<Buffer> {
  const doc = new DocxDocument({
    sections: [{
      properties: {
        page: {
          margin: {
            top: IEEE_CONFIG.marginTop * 20, // Convert to twips
            right: IEEE_CONFIG.marginRight * 20,
            bottom: IEEE_CONFIG.marginBottom * 20,
            left: IEEE_CONFIG.marginLeft * 20,
          },
          size: {
            orientation: "portrait",
          },
        },
        column: {
          space: IEEE_CONFIG.columnSpacing * 20,
          count: IEEE_CONFIG.columnCount,
        },
      },
      children: await generateDocumentContent(document),
    }],
  });

  return await Packer.toBuffer(doc);
}

async function generateDocumentContent(document: Document): Promise<Paragraph[]> {
  const content: Paragraph[] = [];

  // Add title
  if (document.title) {
    content.push(new Paragraph({
      text: document.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 240, // 12pt after
      },
      run: {
        font: IEEE_CONFIG.fontName,
        size: IEEE_CONFIG.fontSizeTitle * 2, // Convert to half-points
        bold: true,
      },
    }));
  }

  // Add authors using table layout (matching Python implementation)
  if (document.authors && document.authors.length > 0) {
    content.push(...addAuthorsTable(document.authors));
  }

  // Add footnote if we have publication dates/funding/DOI
  if (document.receivedDate || document.revisedDate || document.acceptedDate || document.funding || document.doi) {
    content.push(addFootnote(document));
  }

  // Add abstract
  if (document.abstract) {
    content.push(new Paragraph({
      children: [
        new TextRun({
          text: "Abstract—",
          font: IEEE_CONFIG.fontName,
          size: IEEE_CONFIG.fontSizeBody * 2,
          italics: true,
        }),
        new TextRun({
          text: document.abstract,
          font: IEEE_CONFIG.fontName,
          size: IEEE_CONFIG.fontSizeBody * 2,
        }),
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: {
        after: IEEE_CONFIG.lineSpacing * 20,
        line: IEEE_CONFIG.lineSpacing * 20,
        lineRule: "exact",
      },
    }));
  }

  // Add keywords
  if (document.keywords) {
    content.push(new Paragraph({
      text: `Keywords: ${document.keywords}`,
      alignment: AlignmentType.JUSTIFIED,
      spacing: {
        after: IEEE_CONFIG.lineSpacing * 20,
        line: IEEE_CONFIG.lineSpacing * 20,
        lineRule: "exact",
      },
      run: {
        font: IEEE_CONFIG.fontName,
        size: IEEE_CONFIG.fontSizeBody * 2,
      },
    }));
  }

  // Add sections
  if (document.sections && document.sections.length > 0) {
    for (let i = 0; i < document.sections.length; i++) {
      content.push(...addSection(document.sections[i], i + 1, i === 0));
    }
  }

  // Add references
  if (document.references && document.references.length > 0) {
    content.push(...addReferences(document.references));
  }

  return content;
}

function addAuthorsTable(authors: Author[]): Paragraph[] {
  const content: Paragraph[] = [];
  
  // Create table for parallel author layout
  const authorCells = authors.map(author => {
    const cellContent: Paragraph[] = [];
    
    // Author name (bold)
    cellContent.push(new Paragraph({
      text: author.name,
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      run: {
        font: IEEE_CONFIG.fontName,
        size: IEEE_CONFIG.fontSizeBody * 2,
        bold: true,
      },
    }));

    // Author details (italic)
    const details = [
      author.department,
      author.organization,
      author.city,
      author.state,
    ].filter(Boolean);

    details.forEach(detail => {
      cellContent.push(new Paragraph({
        text: detail!,
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        run: {
          font: IEEE_CONFIG.fontName,
          size: IEEE_CONFIG.fontSizeBody * 2,
          italics: true,
        },
      }));
    });

    // Custom fields
    author.customFields?.forEach(field => {
      if (field.value) {
        cellContent.push(new Paragraph({
          text: field.value,
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          run: {
            font: IEEE_CONFIG.fontName,
            size: IEEE_CONFIG.fontSizeBody * 2,
            italics: true,
          },
        }));
      }
    });

    return new TableCell({
      children: cellContent,
      verticalAlign: "top",
    });
  });

  const table = new Table({
    rows: [new TableRow({ children: authorCells })],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
  });

  // Add spacing after table
  content.push(new Paragraph({
    children: [table],
    spacing: { after: 240 },
  }));

  return content;
}

function addFootnote(document: Document): Paragraph {
  let footnoteText = "";
  if (document.receivedDate) footnoteText += `Manuscript received ${document.receivedDate}; `;
  if (document.revisedDate) footnoteText += `revised ${document.revisedDate}; `;
  if (document.acceptedDate) footnoteText += `accepted ${document.acceptedDate}. `;
  if (document.funding) footnoteText += `This work was supported by ${document.funding}. `;
  if (document.doi) footnoteText += `(DOI: ${document.doi})`;

  return new Paragraph({
    text: footnoteText.trim(),
    spacing: {
      after: 120,
    },
    run: {
      font: IEEE_CONFIG.fontName,
      size: IEEE_CONFIG.fontSizeCaption * 2,
    },
  });
}

function addSection(section: Section, sectionIndex: number, isFirst: boolean): Paragraph[] {
  const content: Paragraph[] = [];

  // Section heading
  if (section.title) {
    content.push(new Paragraph({
      text: `${sectionIndex}. ${section.title.toUpperCase()}`,
      heading: HeadingLevel.HEADING_1,
      spacing: {
        before: isFirst ? IEEE_CONFIG.lineSpacing * 20 : IEEE_CONFIG.lineSpacing * 20,
        after: 0,
      },
      run: {
        font: IEEE_CONFIG.fontName,
        size: IEEE_CONFIG.fontSizeBody * 2,
        bold: true,
      },
    }));
  }

  // Content blocks (text and images in order)
  section.contentBlocks?.forEach((block, blockIndex) => {
    if (block.type === 'text' && block.content) {
      content.push(new Paragraph({
        text: block.content,
        alignment: AlignmentType.JUSTIFIED,
        spacing: {
          before: isFirst && blockIndex === 0 ? IEEE_CONFIG.lineSpacing * 20 : 60,
          after: 240,
          line: IEEE_CONFIG.lineSpacing * 20,
          lineRule: "exact",
        },
        indent: {
          left: IEEE_CONFIG.columnIndent * 20,
          right: IEEE_CONFIG.columnIndent * 20,
        },
        run: {
          font: IEEE_CONFIG.fontName,
          size: IEEE_CONFIG.fontSizeBody * 2,
        },
      }));
    } else if (block.type === 'image' && block.content) {
      // Add image with caption
      content.push(...addImageBlock(block, sectionIndex, blockIndex + 1));
    }
  });

  // Subsections
  section.subsections?.forEach((subsection, subIndex) => {
    if (subsection.title) {
      content.push(new Paragraph({
        text: `${sectionIndex}.${subIndex + 1} ${subsection.title}`,
        heading: HeadingLevel.HEADING_2,
        spacing: {
          before: IEEE_CONFIG.lineSpacing * 20,
          after: 0,
        },
        run: {
          font: IEEE_CONFIG.fontName,
          size: IEEE_CONFIG.fontSizeBody * 2,
          bold: true,
        },
      }));
    }

    if (subsection.content) {
      content.push(new Paragraph({
        text: subsection.content,
        alignment: AlignmentType.JUSTIFIED,
        spacing: {
          before: 20,
          after: 240,
          line: IEEE_CONFIG.lineSpacing * 20,
          lineRule: "exact",
        },
        indent: {
          left: IEEE_CONFIG.columnIndent * 20,
          right: IEEE_CONFIG.columnIndent * 20,
        },
        run: {
          font: IEEE_CONFIG.fontName,
          size: IEEE_CONFIG.fontSizeBody * 2,
        },
      }));
    }
  });

  return content;
}

function addImageBlock(block: ContentBlock, sectionIndex: number, imageIndex: number): Paragraph[] {
  const content: Paragraph[] = [];

  if (block.content && block.size) {
    try {
      // Convert base64 to buffer
      const imageData = Buffer.from(block.content.split(',')[1] || block.content, 'base64');
      const size = IEEE_CONFIG.figureSizes[block.size] || IEEE_CONFIG.figureSizes['medium'];
      
      // Add image
      content.push(new Paragraph({
        children: [
          new ImageRun({
            data: imageData,
            transformation: {
              width: size,
              height: size * 0.75,
            },
            type: "jpg",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 120,
          after: 120,
        },
      }));

      // Add caption
      if (block.caption) {
        content.push(new Paragraph({
          text: `Fig. ${sectionIndex}.${imageIndex}: ${block.caption}`,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 240,
          },
          run: {
            font: IEEE_CONFIG.fontName,
            size: IEEE_CONFIG.fontSizeCaption * 2,
          },
        }));
      }
    } catch (error) {
      console.error('Error adding image:', error);
      // Add placeholder text if image fails
      content.push(new Paragraph({
        text: `[Image: ${block.caption || 'Figure'}]`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        run: {
          font: IEEE_CONFIG.fontName,
          size: IEEE_CONFIG.fontSizeBody * 2,
          italics: true,
        },
      }));
    }
  }

  return content;
}

function addReferences(references: Reference[]): Paragraph[] {
  const content: Paragraph[] = [];

  // References heading
  content.push(new Paragraph({
    text: "REFERENCES",
    heading: HeadingLevel.HEADING_1,
    spacing: {
      before: IEEE_CONFIG.lineSpacing * 20,
      after: 0,
    },
    run: {
      font: IEEE_CONFIG.fontName,
      size: IEEE_CONFIG.fontSizeBody * 2,
      bold: true,
    },
  }));

  // Reference entries with hanging indent
  references.forEach((ref, index) => {
    content.push(new Paragraph({
      text: `[${index + 1}] ${ref.text}`,
      alignment: AlignmentType.JUSTIFIED,
      spacing: {
        before: 60,
        after: 240,
        line: IEEE_CONFIG.lineSpacing * 20,
        lineRule: "exact",
      },
      indent: {
        left: (IEEE_CONFIG.columnIndent + 18) * 20, // Left + 0.25 inches
        right: IEEE_CONFIG.columnIndent * 20,
        hanging: 18 * 20, // 0.25 inches hanging
      },
      run: {
        font: IEEE_CONFIG.fontName,
        size: IEEE_CONFIG.fontSizeBody * 2,
      },
    }));
  });

  return content;
}