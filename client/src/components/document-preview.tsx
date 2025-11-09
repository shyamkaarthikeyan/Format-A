import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Download, FileText, Mail, RefreshCw, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { documentApi } from "@/lib/api";
import type { Document } from "@shared/schema";
import jsPDF from "jspdf";
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

// CSS to hide PDF browser controls while keeping interactivity
const pdfHideControlsCSS = `
  object[type="application/pdf"] {
    outline: none;
    border: none;
  }
  
  /* Allow PDF interaction while hiding context menu */
  .pdf-preview-container {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  
  /* Keep iframe interactive */
  .pdf-preview-container iframe {
    pointer-events: auto !important;
  }
`;

// Inject the CSS into the document head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pdfHideControlsCSS;
  document.head.appendChild(style);
}

interface DocumentPreviewProps {
  document: Document;
  documentId: string | null;
}



// DOCX generation now uses Python backend API for proper IEEE formatting (same as PDF)

// Client-side PDF generation function using jsPDF with proper IEEE format
function generateClientSidePDF(document: Document): Blob {
  try {
    // Validate document data
    if (!document) {
      throw new Error('Document data is missing');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 54; // 0.75 inch margin
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    // IEEE 2-column layout calculations
    const columnGap = 18; // 0.25 inch gap between columns
    const columnWidth_IEEE = (contentWidth - columnGap) / 2;
    const leftColumnX_IEEE = margin;
    const rightColumnX_IEEE = margin + columnWidth_IEEE + columnGap;

    // Track current column position for 2-column layout
    let leftColumnY_IEEE = 0;
    let rightColumnY_IEEE = 0;
    let currentColumn_IEEE = 'left';
    let inTwoColumnMode = false;

    // Helper function to switch to 2-column layout
    const startTwoColumnLayout = () => {
      inTwoColumnMode = true;
      leftColumnY_IEEE = currentY;
      rightColumnY_IEEE = currentY;
      currentColumn_IEEE = 'left';
      return {
        leftColumnX: leftColumnX_IEEE,
        rightColumnX: rightColumnX_IEEE,
        columnWidth: columnWidth_IEEE
      };
    };

    // Helper function to add text in 2-column layout
    const addTextToColumns = (
      pdf: any,
      text: string,
      leftY: number,
      rightY: number,
      currentCol: string,
      fontSize: number,
      fontStyle: string = 'normal',
      leftX: number,
      rightX: number,
      colWidth: number
    ) => {
      try {
        if (!text || typeof text !== 'string') {
          return { leftY, rightY, currentColumn: currentCol };
        }

        pdf.setFontSize(fontSize);
        pdf.setFont('times', fontStyle);

        const lines = pdf.splitTextToSize(text, colWidth);
        let workingY = currentCol === 'left' ? leftY : rightY;
        let workingX = currentCol === 'left' ? leftX : rightX;
        let workingColumn = currentCol;

        lines.forEach((line: string) => {
          // Check if we need to switch columns or add a new page
          if (workingY + fontSize + 10 > pageHeight - margin) {
            if (workingColumn === 'left') {
              // Switch to right column
              workingColumn = 'right';
              workingY = rightY;
              workingX = rightX;
            } else {
              // Add new page and reset to left column
              pdf.addPage();
              workingY = margin;
              leftY = margin;
              rightY = margin;
              workingColumn = 'left';
              workingX = leftX;
            }
          }

          pdf.text(line, workingX, workingY);
          workingY += fontSize + 3;

          // Update column positions
          if (workingColumn === 'left') {
            leftY = workingY;
          } else {
            rightY = workingY;
          }
        });

        return {
          leftY,
          rightY,
          currentColumn: workingColumn
        };
      } catch (error) {
        console.error('Error in addTextToColumns:', error);
        return { leftY, rightY, currentColumn: currentCol };
      }
    };

    // Helper function for single-column text (title, authors, abstract, keywords)
    const addSingleColumnText = (
      pdf: any,
      text: string,
      startY: number,
      fontSize: number,
      fontStyle: string = 'normal',
      center: boolean = false,
      continueSameLine: boolean = false,
      prefixText: string = ''
    ) => {
      try {
        if (!text || typeof text !== 'string') {
          console.warn('Invalid text provided to addSingleColumnText:', text);
          return startY;
        }

        pdf.setFontSize(fontSize);
        pdf.setFont('times', fontStyle);

        let textY = startY;
        let textX = margin;

        if (continueSameLine && prefixText) {
          // Calculate position after prefix text
          const prefixWidth = pdf.getTextWidth(prefixText);
          textX = margin + prefixWidth;
          const remainingWidth = contentWidth - prefixWidth;
          const lines = pdf.splitTextToSize(text, remainingWidth);

          // First line on same line as prefix
          if (lines.length > 0) {
            pdf.text(lines[0], textX, textY);
            textY += fontSize + 4;

            // Remaining lines at full width
            for (let i = 1; i < lines.length; i++) {
              if (textY + fontSize > pageHeight - margin) {
                pdf.addPage();
                textY = margin;
              }
              pdf.text(lines[i], margin, textY);
              textY += fontSize + 4;
            }
          }
        } else {
          // Normal text processing
          const lines = pdf.splitTextToSize(text, contentWidth);

          for (let i = 0; i < lines.length; i++) {
            if (textY + fontSize > pageHeight - margin) {
              pdf.addPage();
              textY = margin;
            }

            if (center) {
              const textWidth = pdf.getTextWidth(lines[i]);
              textX = (pageWidth - textWidth) / 2;
            }

            pdf.text(lines[i], textX, textY);
            textY += fontSize + 4;
          }
        }

        return textY;
      } catch (error) {
        console.error('Error in addSingleColumnText:', error);
        return startY;
      }
    };

    // Title - IEEE format (24pt bold, centered, single column)
    if (document.title && typeof document.title === 'string') {
      try {
        pdf.setFontSize(24);
        pdf.setFont('times', 'bold');
        currentY = addSingleColumnText(pdf, document.title, currentY, 24, 'bold', true);
        currentY += 12; // IEEE standard spacing after title
      } catch (error) {
        console.error('Error adding title:', error);
      }
    }

    // Authors - IEEE format (proper table layout: 1 author = centered, 2 authors = 2 columns, 3+ authors = 3 columns per row)
    if (document.authors && Array.isArray(document.authors) && document.authors.length > 0) {
      try {
        const validAuthors = document.authors.filter(author => author && author.name && typeof author.name === 'string');

        if (validAuthors.length > 0) {
          pdf.setFontSize(10);
          pdf.setFont('times', 'normal');

          // IEEE format: maximum 3 authors per row, create additional rows for more authors
          const authorsPerRow = 3;
          const totalAuthors = validAuthors.length;

          // Process authors in groups of 3
          for (let rowStart = 0; rowStart < totalAuthors; rowStart += authorsPerRow) {
            const rowEnd = Math.min(rowStart + authorsPerRow, totalAuthors);
            const rowAuthors = validAuthors.slice(rowStart, rowEnd);
            const numCols = rowAuthors.length;

            // Calculate column positions for this row
            let columnWidth, startX;
            if (numCols === 1) {
              // Single author - centered
              columnWidth = contentWidth;
              startX = margin;
            } else if (numCols === 2) {
              // Two authors - two equal columns
              columnWidth = contentWidth / 2;
              startX = margin;
            } else {
              // Three authors - three equal columns
              columnWidth = contentWidth / 3;
              startX = margin;
            }

            // Track the maximum height for this row
            let maxRowHeight = 0;
            const authorBlocks = [];

            // Process each author in this row
            rowAuthors.forEach((author, colIdx) => {
              const columnX = startX + (colIdx * columnWidth);
              const centerX = columnX + (columnWidth / 2);

              let blockHeight = 0;
              const authorLines = [];

              // Author name - bold, centered
              pdf.setFontSize(10);
              pdf.setFont('times', 'bold');
              const nameWidth = pdf.getTextWidth(author.name);
              const nameX = centerX - (nameWidth / 2);
              authorLines.push({
                text: author.name,
                x: nameX,
                y: currentY + blockHeight,
                font: 'bold',
                size: 10
              });
              blockHeight += 14;

              // Add affiliations - italic, centered
              pdf.setFont('times', 'italic');
              const affiliationFields = [
                author.department,
                author.organization,
                author.university,
                author.institution
              ].filter(Boolean);

              affiliationFields.forEach(field => {
                const fieldWidth = pdf.getTextWidth(field);
                const fieldX = centerX - (fieldWidth / 2);
                authorLines.push({
                  text: field,
                  x: fieldX,
                  y: currentY + blockHeight,
                  font: 'italic',
                  size: 10
                });
                blockHeight += 12;
              });

              // Add location if available
              const locationParts = [author.city, author.state, author.country].filter(Boolean);
              if (locationParts.length > 0) {
                const location = locationParts.join(', ');
                const locationWidth = pdf.getTextWidth(location);
                const locationX = centerX - (locationWidth / 2);
                authorLines.push({
                  text: location,
                  x: locationX,
                  y: currentY + blockHeight,
                  font: 'italic',
                  size: 10
                });
                blockHeight += 12;
              }

              // Add email if available - slightly smaller font
              if (author.email) {
                pdf.setFontSize(9);
                const emailWidth = pdf.getTextWidth(author.email);
                const emailX = centerX - (emailWidth / 2);
                authorLines.push({
                  text: author.email,
                  x: emailX,
                  y: currentY + blockHeight,
                  font: 'normal',
                  size: 9
                });
                blockHeight += 12;
              }

              authorBlocks.push(authorLines);
              maxRowHeight = Math.max(maxRowHeight, blockHeight);
            });

            // Now render all author blocks for this row
            authorBlocks.forEach(authorLines => {
              authorLines.forEach(line => {
                pdf.setFontSize(line.size);
                pdf.setFont('times', line.font);
                pdf.text(line.text, line.x, line.y);
              });
            });

            // Move to next row position
            currentY += maxRowHeight + 8; // Add spacing between author rows
          }

          currentY += 10; // IEEE standard spacing after all authors
        }
      } catch (error) {
        console.error('Error adding authors:', error);
      }
    }

    // Start 2-column layout after authors
    const { leftColumnX, rightColumnX, columnWidth } = startTwoColumnLayout();
    let currentColumn_Main = 'left';
    let leftColumnY_Main = currentY;
    let rightColumnY_Main = currentY;

    // Update column positions for 2-column content
    leftColumnY_Main = currentY;
    rightColumnY_Main = currentY;

    // Abstract - IEEE format (9pt bold italic title, content in bold, 2-column layout)
    if (document.abstract && typeof document.abstract === 'string') {
      try {
        // Abstract title and content in 2-column layout
        const abstractText = `Abstract—${document.abstract}`;
        const abstractResult = addTextToColumns(
          pdf, abstractText, leftColumnY_Main, rightColumnY_Main, currentColumn_Main,
          9, 'bold', leftColumnX, rightColumnX, columnWidth
        );
        leftColumnY_Main = abstractResult.leftY + 6;
        rightColumnY_Main = abstractResult.rightY + 6;
        currentColumn_Main = abstractResult.currentColumn;
      } catch (error) {
        console.error('Error adding abstract:', error);
      }
    }

    // Keywords - IEEE format (9pt bold italic title, content in bold, 2-column layout)
    if (document.keywords && typeof document.keywords === 'string') {
      try {
        // Keywords title and content in 2-column layout
        const keywordsText = `Keywords—${document.keywords}`;
        const keywordsResult = addTextToColumns(
          pdf, keywordsText, leftColumnY_Main, rightColumnY_Main, currentColumn_Main,
          9, 'bold', leftColumnX, rightColumnX, columnWidth
        );
        leftColumnY_Main = keywordsResult.leftY + 12;
        rightColumnY_Main = keywordsResult.rightY + 12;
        currentColumn_Main = keywordsResult.currentColumn;
      } catch (error) {
        console.error('Error adding keywords:', error);
      }
    }

    // Sections - IEEE format (10pt bold, centered, 2-column layout)
    if (document.sections && Array.isArray(document.sections) && document.sections.length > 0) {
      console.log('Processing sections in PDF:', document.sections.length, 'sections found');
      try {
        document.sections.forEach((section, index) => {
          console.log(`Processing section ${index + 1}:`, {
            title: section.title,
            contentBlocksCount: section.contentBlocks?.length || 0,
            contentBlocks: section.contentBlocks?.map(block => ({
              type: block.type,
              hasContent: !!block.content,
              contentPreview: block.content?.substring(0, 50) + '...'
            })) || []
          });

          if (section && section.title && typeof section.title === 'string') {
            try {
              // Section title - IEEE format: 10pt bold, center-aligned within current column
              pdf.setFontSize(10);
              pdf.setFont('times', 'bold');
              const sectionTitle = `${index + 1}. ${section.title.toUpperCase()}`;

              // Add section title centered within current column
              const currentColumnX = currentColumn_Main === 'left' ? leftColumnX : rightColumnX;
              const titleWidth = pdf.getTextWidth(sectionTitle);
              const centeredX = currentColumnX + (columnWidth - titleWidth) / 2;
              const currentY = currentColumn_Main === 'left' ? leftColumnY_Main : rightColumnY_Main;

              pdf.text(sectionTitle, centeredX, currentY);

              // Update column positions
              const titleResult = {
                leftY: currentColumn_Main === 'left' ? currentY + 14 : leftColumnY_Main,
                rightY: currentColumn_Main === 'right' ? currentY + 14 : rightColumnY_Main,
                currentColumn: currentColumn_Main
              };
              leftColumnY_Main = titleResult.leftY;
              rightColumnY_Main = titleResult.rightY;
              currentColumn_Main = titleResult.currentColumn;

              // Process contentBlocks for section content
              if (section.contentBlocks && Array.isArray(section.contentBlocks)) {
                console.log(`Processing ${section.contentBlocks.length} content blocks for section "${section.title}"`);
                section.contentBlocks
                  .sort((a, b) => a.order - b.order) // Sort by order
                  .forEach((block, blockIndex) => {
                    console.log(`Processing content block ${blockIndex + 1}:`, {
                      type: block.type,
                      hasContent: !!block.content,
                      contentLength: block.content?.length || 0
                    });

                    if (block.type === 'text' && block.content && typeof block.content === 'string') {
                      // Add text content to columns
                      const contentResult = addTextToColumns(
                        pdf, block.content, leftColumnY_Main, rightColumnY_Main, currentColumn_Main,
                        10, 'normal', leftColumnX, rightColumnX, columnWidth
                      );
                      leftColumnY_Main = contentResult.leftY + 6; // Add spacing between blocks
                      rightColumnY_Main = contentResult.rightY + 6;
                      currentColumn_Main = contentResult.currentColumn;
                      console.log(`Added text block to PDF successfully`);

                      // Check if this text block also has an image attached
                      if (block.data && block.caption) {
                        try {
                          // Add image to PDF
                          const imageData = `data:image/png;base64,${block.data}`;
                          const currentColumnX = currentColumn_Main === 'left' ? leftColumnX : rightColumnX;
                          const currentY = currentColumn_Main === 'left' ? leftColumnY_Main : rightColumnY_Main;

                          // Add image centered in current column
                          const imgWidth = columnWidth * 0.8; // 80% of column width
                          const imgX = currentColumnX + (columnWidth - imgWidth) / 2;

                          pdf.addImage(imageData, 'PNG', imgX, currentY, imgWidth, 0); // Auto height

                          // Add caption
                          const captionY = currentY + 60; // Adjust based on image height
                          pdf.setFontSize(9);
                          pdf.setFont('times', 'italic');
                          const captionText = `Fig. ${index}.${blockIndex + 1}: ${block.caption}`;
                          const captionWidth = pdf.getTextWidth(captionText);
                          const captionX = currentColumnX + (columnWidth - captionWidth) / 2;
                          pdf.text(captionText, captionX, captionY);

                          // Update column positions
                          if (currentColumn_Main === 'left') {
                            leftColumnY_Main = captionY + 15;
                          } else {
                            rightColumnY_Main = captionY + 15;
                          }

                          console.log(`Added image to PDF successfully`);
                        } catch (imageError) {
                          console.error('Error adding image to PDF:', imageError);
                        }
                      }
                    } else if (block.type === 'image' && block.data && block.caption) {
                      // Handle standalone image blocks
                      try {
                        const imageData = `data:image/png;base64,${block.data}`;
                        const currentColumnX = currentColumn_Main === 'left' ? leftColumnX : rightColumnX;
                        const currentY = currentColumn_Main === 'left' ? leftColumnY_Main : rightColumnY_Main;

                        // Add image centered in current column
                        const imgWidth = columnWidth * 0.8; // 80% of column width
                        const imgX = currentColumnX + (columnWidth - imgWidth) / 2;

                        pdf.addImage(imageData, 'PNG', imgX, currentY, imgWidth, 0); // Auto height

                        // Add caption
                        const captionY = currentY + 60; // Adjust based on image height
                        pdf.setFontSize(9);
                        pdf.setFont('times', 'italic');
                        const captionText = `Fig. ${index}.${blockIndex + 1}: ${block.caption}`;
                        const captionWidth = pdf.getTextWidth(captionText);
                        const captionX = currentColumnX + (columnWidth - captionWidth) / 2;
                        pdf.text(captionText, captionX, captionY);

                        // Update column positions
                        if (currentColumn_Main === 'left') {
                          leftColumnY_Main = captionY + 15;
                        } else {
                          rightColumnY_Main = captionY + 15;
                        }

                        console.log(`Added standalone image to PDF successfully`);
                      } catch (imageError) {
                        console.error('Error adding standalone image to PDF:', imageError);
                      }
                    } else if (block.type === 'table') {
                      // Handle different table types
                      try {
                        const currentColumnX = currentColumn_Main === 'left' ? leftColumnX : rightColumnX;
                        const currentY = currentColumn_Main === 'left' ? leftColumnY_Main : rightColumnY_Main;
                        const tableType = (block as any).tableType || 'image';

                        if (tableType === 'interactive' && (block as any).headers && (block as any).tableData) {
                          // Handle interactive tables - render as actual table
                          const headers = (block as any).headers;
                          const tableData = (block as any).tableData;
                          const tableName = (block as any).tableName || 'Table';

                          // Calculate table dimensions
                          const cellPadding = 4;
                          const cellHeight = 16;
                          const headerHeight = 18;
                          const tableWidth = columnWidth * 0.95;
                          const colWidth = tableWidth / headers.length;

                          let tableY = currentY;

                          // Draw table border
                          pdf.setDrawColor(0, 0, 0);
                          pdf.setLineWidth(0.5);

                          // Draw header row
                          pdf.setFillColor(240, 240, 240); // Light gray background
                          pdf.rect(currentColumnX, tableY, tableWidth, headerHeight, 'FD');

                          // Add header text
                          pdf.setFontSize(8);
                          pdf.setFont('times', 'bold');
                          headers.forEach((header: string, colIndex: number) => {
                            const cellX = currentColumnX + (colIndex * colWidth);
                            const textX = cellX + cellPadding;
                            const textY = tableY + headerHeight - cellPadding;

                            // Truncate text if too long
                            const maxWidth = colWidth - (2 * cellPadding);
                            const truncatedText = pdf.splitTextToSize(header, maxWidth)[0] || header;
                            pdf.text(truncatedText, textX, textY);

                            // Draw vertical lines
                            if (colIndex > 0) {
                              pdf.line(cellX, tableY, cellX, tableY + headerHeight);
                            }
                          });

                          tableY += headerHeight;

                          // Draw data rows
                          pdf.setFont('times', 'normal');
                          pdf.setFillColor(255, 255, 255); // White background

                          tableData.forEach((row: string[], rowIndex: number) => {
                            // Alternate row colors for better readability
                            if (rowIndex % 2 === 1) {
                              pdf.setFillColor(248, 248, 248); // Very light gray
                            } else {
                              pdf.setFillColor(255, 255, 255); // White
                            }

                            pdf.rect(currentColumnX, tableY, tableWidth, cellHeight, 'FD');

                            // Add cell text
                            row.forEach((cell: string, colIndex: number) => {
                              if (colIndex < headers.length) {
                                const cellX = currentColumnX + (colIndex * colWidth);
                                const textX = cellX + cellPadding;
                                const textY = tableY + cellHeight - cellPadding;

                                // Truncate text if too long
                                const maxWidth = colWidth - (2 * cellPadding);
                                const truncatedText = pdf.splitTextToSize(cell, maxWidth)[0] || cell;
                                pdf.text(truncatedText, textX, textY);

                                // Draw vertical lines
                                if (colIndex > 0) {
                                  pdf.line(cellX, tableY, cellX, tableY + cellHeight);
                                }
                              }
                            });

                            tableY += cellHeight;
                          });

                          // Draw outer border
                          pdf.rect(currentColumnX, currentY, tableWidth, tableY - currentY);

                          // Add table caption
                          const captionY = tableY + 8;
                          pdf.setFontSize(9);
                          pdf.setFont('times', 'normal');
                          const captionText = `Table ${index + 1}.${blockIndex + 1}: ${tableName}`;
                          const captionWidth = pdf.getTextWidth(captionText);
                          const captionX = currentColumnX + (columnWidth - captionWidth) / 2;
                          pdf.text(captionText, captionX, captionY);

                          // Update column positions
                          if (currentColumn_Main === 'left') {
                            leftColumnY_Main = captionY + 15;
                          } else {
                            rightColumnY_Main = captionY + 15;
                          }

                          console.log(`Added interactive table to PDF successfully`);

                        } else if (tableType === 'latex' && (block as any).latexCode) {
                          // Handle LaTeX tables - render as formatted code
                          const latexCode = (block as any).latexCode;
                          const tableName = (block as any).tableName || 'Table';

                          // Add LaTeX code as formatted text
                          pdf.setFontSize(8);
                          pdf.setFont('courier', 'normal');

                          const codeLines = pdf.splitTextToSize(latexCode, columnWidth * 0.9);
                          let codeY = currentY;

                          // Draw background for code
                          const codeHeight = codeLines.length * 10 + 8;
                          pdf.setFillColor(248, 248, 248);
                          pdf.rect(currentColumnX, codeY, columnWidth * 0.9, codeHeight, 'F');

                          // Add code text
                          codeLines.forEach((line: string, lineIndex: number) => {
                            pdf.text(line, currentColumnX + 4, codeY + 12 + (lineIndex * 10));
                          });

                          codeY += codeHeight;

                          // Add table caption
                          const captionY = codeY + 8;
                          pdf.setFontSize(9);
                          pdf.setFont('times', 'normal');
                          const captionText = `Table ${index + 1}.${blockIndex + 1}: ${tableName}`;
                          const captionWidth = pdf.getTextWidth(captionText);
                          const captionX = currentColumnX + (columnWidth - captionWidth) / 2;
                          pdf.text(captionText, captionX, captionY);

                          // Update column positions
                          if (currentColumn_Main === 'left') {
                            leftColumnY_Main = captionY + 15;
                          } else {
                            rightColumnY_Main = captionY + 15;
                          }

                          console.log(`Added LaTeX table to PDF successfully`);

                        } else if (block.data && (block as any).tableName) {
                          // Handle image tables (existing functionality)
                          const imageData = `data:image/png;base64,${block.data}`;

                          // Add table image centered in current column
                          const imgWidth = columnWidth * 0.9; // 90% of column width for tables
                          const imgX = currentColumnX + (columnWidth - imgWidth) / 2;

                          pdf.addImage(imageData, 'PNG', imgX, currentY, imgWidth, 0); // Auto height

                          // Add table caption
                          const captionY = currentY + 80; // Adjust based on table height
                          pdf.setFontSize(9);
                          pdf.setFont('times', 'normal');
                          const captionText = `Table ${index + 1}.${blockIndex + 1}: ${(block as any).tableName}`;
                          const captionWidth = pdf.getTextWidth(captionText);
                          const captionX = currentColumnX + (columnWidth - captionWidth) / 2;
                          pdf.text(captionText, captionX, captionY);

                          // Update column positions
                          if (currentColumn_Main === 'left') {
                            leftColumnY_Main = captionY + 15;
                          } else {
                            rightColumnY_Main = captionY + 15;
                          }

                          console.log(`Added image table to PDF successfully`);
                        }
                      } catch (tableError) {
                        console.error('Error adding table to PDF:', tableError);
                      }
                    } else if (block.type === 'equation' && block.content) {
                      // Handle equation blocks
                      try {
                        const currentColumnX = currentColumn_Main === 'left' ? leftColumnX : rightColumnX;
                        const currentY = currentColumn_Main === 'left' ? leftColumnY_Main : rightColumnY_Main;

                        // Add equation content centered in current column
                        pdf.setFontSize(10);
                        pdf.setFont('times', 'italic');
                        const equationText = block.content;
                        const equationWidth = pdf.getTextWidth(equationText);
                        const equationX = currentColumnX + (columnWidth - equationWidth) / 2;

                        pdf.text(equationText, equationX, currentY);

                        // Add equation number if needed
                        const eqNumberY = currentY + 15;
                        pdf.setFontSize(9);
                        pdf.setFont('times', 'normal');
                        const eqNumberText = `(${index}.${blockIndex + 1})`;
                        const eqNumberWidth = pdf.getTextWidth(eqNumberText);
                        const eqNumberX = currentColumnX + columnWidth - eqNumberWidth;
                        pdf.text(eqNumberText, eqNumberX, eqNumberY);

                        // Update column positions
                        if (currentColumn_Main === 'left') {
                          leftColumnY_Main = eqNumberY + 15;
                        } else {
                          rightColumnY_Main = eqNumberY + 15;
                        }

                        console.log(`Added equation to PDF successfully`);
                      } catch (equationError) {
                        console.error('Error adding equation to PDF:', equationError);
                      }
                    } else {
                      console.log(`Skipping block - type: ${block.type}, hasContent: ${!!block.content}`);
                    }
                  });
              } else {
                console.log(`No contentBlocks found for section "${section.title}"`);
              }

              // Fallback: Check for legacy content/body properties
              const legacyContent = (section as any).content || (section as any).body;
              if (legacyContent && typeof legacyContent === 'string' &&
                (!section.contentBlocks || section.contentBlocks.length === 0)) {
                console.log(`Using legacy content for section "${section.title}"`);
                // Add legacy content to columns
                const contentResult = addTextToColumns(
                  pdf, legacyContent, leftColumnY_Main, rightColumnY_Main, currentColumn_Main,
                  10, 'normal', leftColumnX, rightColumnX, columnWidth
                );
                leftColumnY_Main = contentResult.leftY;
                rightColumnY_Main = contentResult.rightY;
                currentColumn_Main = contentResult.currentColumn;
              }
            } catch (sectionError) {
              console.error('Error adding section:', section.title, sectionError);
            }
          } else {
            console.log(`Skipping section ${index + 1} - no title or invalid title`);
          }
        });
      } catch (error) {
        console.error('Error adding sections:', error);
      }
    } else {
      console.log('No sections to process - either null, not array, or empty');
    }

    // References - IEEE format (10pt bold title, 8pt content, 2-column layout)
    if (document.references && Array.isArray(document.references) && document.references.length > 0) {
      try {
        // References title
        pdf.setFontSize(10);
        pdf.setFont('times', 'bold');
        const referencesTitle = 'REFERENCES';

        const titleResult = addTextToColumns(
          pdf, referencesTitle, leftColumnY_Main, rightColumnY_Main, currentColumn_Main,
          10, 'bold', leftColumnX, rightColumnX, columnWidth
        );
        leftColumnY_Main = titleResult.leftY + 6; // Extra space after title
        rightColumnY_Main = titleResult.rightY + 6;
        currentColumn_Main = titleResult.currentColumn;

        // Reference list
        pdf.setFontSize(8);
        pdf.setFont('times', 'normal');

        document.references.forEach((ref, index) => {
          if (ref && ref.text && typeof ref.text === 'string') {
            try {
              const refText = `[${index + 1}] ${ref.text}`;
              const refResult = addTextToColumns(
                pdf, refText, leftColumnY_Main, rightColumnY_Main, currentColumn_Main,
                8, 'normal', leftColumnX, rightColumnX, columnWidth
              );
              leftColumnY_Main = refResult.leftY + 3; // Small spacing between references
              rightColumnY_Main = refResult.rightY + 3;
              currentColumn_Main = refResult.currentColumn;
            } catch (refError) {
              console.error('Error adding reference:', ref.text, refError);
            }
          }
        });
      } catch (error) {
        console.error('Error adding references:', error);
      }
    }

    return pdf.output('blob');
  } catch (error) {
    console.error('Error in generateClientSidePDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default function DocumentPreview({ document, documentId }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(75);
  const [email, setEmail] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState<'pdf' | 'images'>('pdf');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<'download' | 'email' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Debugging to verify document data
  console.log("IEEE Word preview rendering with:", {
    title: document.title,
    hasAuthors: document.authors && document.authors.length > 0,
    hasAbstract: !!document.abstract,
    hasKeywords: !!document.keywords,
    sectionsCount: document.sections?.length || 0,
    sectionsData: document.sections?.map(s => ({
      title: s.title,
      contentBlocksCount: s.contentBlocks?.length || 0,
      contentBlocks: s.contentBlocks?.map(block => ({
        type: block.type,
        hasContent: !!block.content,
        contentLength: block.content?.length || 0
      })) || []
    })) || [],
    referencesCount: document.references?.length || 0,
  });

  // Mutations for generating and emailing documents
  const generateDocxMutation = useMutation({
    mutationFn: async () => {
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }

      console.log('Generating DOCX for download (client-side)...');

      try {
        // Use Python backend API for proper IEEE formatting (same as PDF)
        console.log('Generating DOCX using Python backend API...');
        const result = await documentApi.generateDocx(document);

        if (!result.success) {
          throw new Error(result.message || 'DOCX generation failed');
        }

        // Handle base64 file data
        if (result.file_data) {
          const byteCharacters = atob(result.file_data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const docxBlob = new Blob([byteArray], { 
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
          });

          // Download the DOCX file
          const url = URL.createObjectURL(docxBlob);
          const link = window.document.createElement('a');
          link.href = url;
          link.download = `${document.title || 'ieee_paper'}.docx`;
          link.click();
          URL.revokeObjectURL(url);

          return { success: true, size: docxBlob.size };
        } else {
          throw new Error('No file data received from server');
        }

      } catch (error) {
        console.error('DOCX generation failed:', error);
        throw new Error(`DOCX generation failed: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast({
        title: "DOCX Document Generated",
        description: "IEEE-formatted DOCX document has been downloaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }

      console.log('Generating PDF for download (client-side)...');

      // Use client-side PDF generation for reliable downloads
      const pdfBlob = generateClientSidePDF(document);

      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Failed to generate PDF document');
      }

      // Download the generated PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = "ieee_paper.pdf";
      link.click();
      URL.revokeObjectURL(url);

      // Record the download if user is authenticated
      if (isAuthenticated) {
        try {
          console.log('Recording PDF download...');
          const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
          if (token) {
            const response = await fetch('/api/record-download', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                documentTitle: document.title || 'Untitled Document',
                fileFormat: 'pdf',
                fileSize: pdfBlob.size,
                documentMetadata: {
                  authors: document.authors?.map((a: any) => a.name).filter(Boolean) || [],
                  authorsCount: document.authors?.length || 0,
                  sections: document.sections?.length || 0,
                  references: document.references?.length || 0,
                  figures: document.figures?.length || 0,
                  generatedAt: new Date().toISOString(),
                  source: 'client_side_pdf'
                }
              })
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success) {
                console.log('✅ Download recorded successfully:', result.data?.id);
              } else {
                console.warn('❌ Failed to record download:', result.error?.message);
              }
            } else {
              console.warn('❌ Download recording failed:', response.status);
            }
          }
        } catch (error) {
          console.warn('❌ Error recording download:', error);
          // Don't fail the download if recording fails
        }
      }

      return {
        success: true,
        message: "IEEE-formatted PDF file has been downloaded successfully."
      };
    },
    onSuccess: (data) => {
      toast({
        title: "Document Generated",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }
      if (!emailAddress) throw new Error("Please enter an email address.");

      console.log('Sending email using Python backend API...');
      const result = await documentApi.generateEmail({
        email: emailAddress,
        documentData: document,
      });

      return result;
    },
    onSuccess: () => {
      toast({
        title: "Email Sent Successfully!",
        description: `IEEE paper has been sent to ${email}`,
      });
      setEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Email Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auth handlers
  const handleAuthRequired = (action: 'download' | 'email') => {
    setPendingAction(action);
    setShowAuthPrompt(true);
  };

  const handleSignIn = () => {
    window.location.href = '/signin';
  };

  const handleCancelAuth = () => {
    setShowAuthPrompt(false);
    setPendingAction(null);
  };

  // Download handlers - now work without authentication
  const handleDownloadWord = () => {
    console.log('Download Word clicked, isAuthenticated:', isAuthenticated);
    console.log('Generating DOCX (authentication not required)');
    generateDocxMutation.mutate();
  };

  const handleDownloadPdf = () => {
    console.log('Download PDF clicked, isAuthenticated:', isAuthenticated);
    console.log('Generating PDF (authentication not required)');
    generatePdfMutation.mutate();
  };

  const handleSendEmail = () => {
    if (!isAuthenticated) {
      handleAuthRequired('email');
      return;
    }
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate(email.trim());
  };

  // Generate PDF preview (client-side - fast and reliable)
  const generateDocxPreview = async () => {
    if (!document.title || !document.authors?.some(author => author.name)) {
      setPreviewError("Please add a title and at least one author to generate preview");
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      console.log('Generating PDF preview (client-side)...');

      // Use client-side PDF generation for preview
      const pdfBlob = generateClientSidePDF(document);

      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Failed to generate PDF preview');
      }

      // Clean up previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // Create new blob URL for preview display
      const url = URL.createObjectURL(pdfBlob);
      setPreviewMode('pdf');
      setPreviewImages([]);
      setPdfUrl(url);

      // Try to get actual page count from the PDF
      try {
        // Create a temporary PDF reader to count pages
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const pdfText = new TextDecoder().decode(arrayBuffer);

        // Count pages by looking for page objects in PDF structure
        const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
        const actualPageCount = pageMatches ? pageMatches.length : 1;

        console.log(`PDF generated with ${actualPageCount} pages`);
        setTotalPages(actualPageCount);
        setCurrentPage(1); // Reset to first page
      } catch (pageCountError) {
        console.warn('Could not determine page count, defaulting to 1:', pageCountError);
        setTotalPages(1);
        setCurrentPage(1);
      }

      console.log('✅ PDF preview generated successfully (client-side)');

      toast({
        title: 'Preview Generated',
        description: 'PDF preview created successfully',
      });

    } catch (error) {
      console.error('❌ PDF preview generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF preview';
      setPreviewError(errorMessage);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Auto-generate preview when document has required fields
  useEffect(() => {
    console.log('Document changed, checking for preview generation:', {
      hasTitle: !!document.title,
      hasAuthors: document.authors?.some(author => author.name),
      title: document.title,
      authors: document.authors
    });

    const timer = setTimeout(() => {
      if (document.title && document.authors?.some(author => author.name)) {
        console.log('Triggering PDF preview generation...');
        generateDocxPreview();
      } else {
        console.log('Skipping PDF generation - missing title or authors');
        setPdfUrl(null);
        setPreviewImages([]);
        setPreviewError(null);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [document.title, document.authors, document.sections, document.abstract, document.keywords, document.references]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleZoomIn = () => setZoom(prev => Math.min(200, prev + 25));
  const handleZoomOut = () => setZoom(prev => Math.max(25, prev - 25));





  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <Button
              onClick={handleDownloadWord}
              disabled={generateDocxMutation.isPending || !document.title}
              className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Download className="w-4 h-4 mr-2" />
              {generateDocxMutation.isPending ? "Generating..." : "Download DOCX"}
            </Button>
            <Button
              onClick={handleDownloadPdf}
              disabled={generatePdfMutation.isPending || !document.title}
              variant="outline"
              className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 hover:border-purple-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <FileText className="w-4 h-4 mr-2" />
              {generatePdfMutation.isPending ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Mail className="w-5 h-5 text-purple-600" />
            Send via Email
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sendEmailMutation.isPending}
                className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendEmail();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending || (!isAuthenticated && !email.trim()) || !document.title}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
              {isAuthenticated && <Mail className="w-4 h-4 mr-2" />}
              {sendEmailMutation.isPending ? "Sending..." : !isAuthenticated ? "Sign in to Email" : "Send to Email"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your IEEE paper will be generated and sent as a PDF attachment
          </p>
        </CardContent>
      </Card>

      {/* PDF Preview Section */}
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              Live PDF Preview
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={generateDocxPreview}
                disabled={isGeneratingPreview || !document.title}
                className="text-purple-600 hover:text-purple-700"
              >
                <RefreshCw className={`w-4 h-4 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
              </Button>

              {/* Page Navigation */}
              {pdfUrl && totalPages > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="px-2"
                  >
                    ←
                  </Button>
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                    <span className="text-gray-600">Page</span>
                    <span className="font-medium text-gray-800">{currentPage}</span>
                    <span className="text-gray-600">of</span>
                    <span className="font-medium text-gray-800">{totalPages}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-2"
                  >
                    →
                  </Button>
                  <div className="w-px h-4 bg-gray-300"></div>
                </>
              )}

              <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 25}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-500 min-w-[40px] text-center">{zoom}%</span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-gray-100 overflow-auto" style={{ height: "70vh" }}>
            {isGeneratingPreview ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Generating document preview...</p>
                </div>
              </div>
            ) : previewError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-2">Preview Error</p>
                  <p className="text-gray-600 text-sm">{previewError}</p>
                  <Button
                    onClick={generateDocxPreview}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    disabled={!document.title || !document.authors?.some(author => author.name)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : !document.title || !document.authors?.some(author => author.name) ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Ready for Preview</p>
                  <p className="text-gray-500 text-sm">Add a title and at least one author to generate document preview</p>
                </div>
              </div>
            ) : previewMode === 'images' && previewImages.length > 0 ? (
              <div className="h-full relative overflow-auto bg-white">
                <div
                  className="flex flex-col items-center space-y-4 p-4"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {previewImages.map((image, index) => (
                    <div key={index} className="shadow-lg border border-gray-200">
                      <img
                        src={image.data}
                        alt={`Page ${image.page}`}
                        className="max-w-full h-auto"
                        style={{
                          userSelect: 'none',
                          pointerEvents: 'none'
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="h-full relative bg-white">
                {/* Interactive PDF Viewer with proper scrolling */}
                <div
                  className="relative w-full h-full"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    height: zoom > 100 ? `${zoom}%` : '100%'
                  }}
                >
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&statusbar=0&messages=0&view=FitV&page=${currentPage}`}
                    className="w-full h-full border-0 shadow-lg"
                    style={{
                      outline: 'none',
                      border: 'none',
                      borderRadius: '4px',
                      pointerEvents: 'auto'
                    }}
                    title="PDF Preview"
                    key={`pdf-${currentPage}`}
                  >
                    {/* Fallback message */}
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                      <div className="text-center p-6">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">PDF Preview Not Available</p>
                        <p className="text-gray-500 text-sm">Please use the download buttons above to get your IEEE paper.</p>
                      </div>
                    </div>
                  </iframe>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No preview available</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Authentication Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold">Sign In Required</h3>
            </div>

            <p className="text-gray-600 mb-4">
              To {pendingAction} your document, please sign in to your account.
            </p>

            <div className="space-y-2 mb-6">
              <h4 className="font-medium text-gray-900">Benefits of signing in:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Download PDF and DOCX files</li>
                <li>• Email documents to yourself or collaborators</li>
                <li>• Save document history</li>
                <li>• Access advanced features</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSignIn} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Sign In
              </Button>
              <Button onClick={handleCancelAuth} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}