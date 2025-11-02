import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, convertInchesToTwip } from 'docx';

interface Author {
  name: string;
  affiliation?: string;
  email?: string;
}

interface Section {
  title: string;
  content: string;
}

interface Reference {
  text: string;
}

interface IEEEDocumentData {
  title: string;
  authors: Author[];
  abstract?: string;
  keywords?: string | string[];
  sections?: Section[];
  references?: Reference[];
}

export function generateIEEEDocument(data: IEEEDocumentData): Document {
  const children: Paragraph[] = [];

  // Title - centered, bold, 24pt
  children.push(
    new Paragraph({
      text: data.title,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      style: 'Title',
      children: [
        new TextRun({
          text: data.title,
          bold: true,
          size: 28, // 14pt = 28 half-points
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Authors - centered
  const authorNames = data.authors.map(a => a.name).join(', ');
  children.push(
    new Paragraph({
      text: authorNames,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: authorNames,
          size: 22, // 11pt
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Affiliations - centered, italic
  const affiliations = data.authors
    .map(a => a.affiliation)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .join(', ');
  
  if (affiliations) {
    children.push(
      new Paragraph({
        text: affiliations,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: affiliations,
            italics: true,
            size: 20, // 10pt
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Abstract
  if (data.abstract) {
    children.push(
      new Paragraph({
        text: 'Abstract',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'Abstract',
            bold: true,
            italics: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    children.push(
      new Paragraph({
        text: data.abstract,
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: data.abstract,
            italics: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Keywords
  if (data.keywords) {
    const keywordsText = Array.isArray(data.keywords)
      ? data.keywords.join(', ')
      : data.keywords;
    
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: 'Keywords—',
            bold: true,
            italics: true,
            size: 22,
            font: 'Times New Roman',
          }),
          new TextRun({
            text: keywordsText,
            italics: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Sections
  if (data.sections && data.sections.length > 0) {
    data.sections.forEach((section, index) => {
      // Section heading
      children.push(
        new Paragraph({
          text: `${index + 1}. ${section.title}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: `${index + 1}. ${section.title}`,
              bold: true,
              size: 22,
              font: 'Times New Roman',
            }),
          ],
        })
      );

      // Section content
      children.push(
        new Paragraph({
          text: section.content,
          spacing: { after: 200 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: section.content,
              size: 22,
              font: 'Times New Roman',
            }),
          ],
        })
      );
    });
  }

  // References
  if (data.references && data.references.length > 0) {
    children.push(
      new Paragraph({
        text: 'References',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 150 },
        children: [
          new TextRun({
            text: 'References',
            bold: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    data.references.forEach((ref, index) => {
      const refText = typeof ref === 'string' ? ref : ref.text;
      children.push(
        new Paragraph({
          text: `[${index + 1}] ${refText}`,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `[${index + 1}] ${refText}`,
              size: 20, // 10pt for references
              font: 'Times New Roman',
            }),
          ],
        })
      );
    });
  }

  // Create document with IEEE-style formatting
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.625),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(0.625),
            },
          },
        },
        children,
      },
    ],
  });

  return doc;
}
