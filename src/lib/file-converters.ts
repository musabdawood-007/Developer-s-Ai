/**
 * Client-side file converters: Markdown → MD / PDF / DOCX / TXT
 * ------------------------------------------------------------
 * Used by the chat UI and admin portal to let users download
 * AI-generated content in multiple formats.
 *
 * All conversions happen in the browser — no server round-trip.
 */

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || "document"
  );
}

function deriveTitle(markdown: string): string {
  const firstHeading = markdown.match(/^#\s+(.+)$/m);
  if (firstHeading) return firstHeading[1].trim();
  const firstLine = markdown.trim().split("\n")[0]?.replace(/[*_`#]/g, "").trim();
  return firstLine || "Document";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(markdown: string, filename?: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, (filename ?? slugify(deriveTitle(markdown))) + ".md");
}

export function downloadText(markdown: string, filename?: string) {
  // Strip common markdown formatting for a clean .txt export
  const plain = markdownToPlainText(markdown);
  const blob = new Blob([plain], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, (filename ?? slugify(deriveTitle(markdown))) + ".txt");
}

function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) => code) // strip code fences
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^\s*[-*+]\s+/gm, "• ") // lists
    .replace(/^\s*\d+\.\s+/gm, "") // numbered lists
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^>\s+/gm, "") // blockquotes
    .replace(/^---+$/gm, "") // hr
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, (m) => {
      // Keep a few safe typographic symbols; strip the rest
      if (/[•°–—‘’“”…©®™±×÷]/.test(m)) return m;
      return "";
    })
    .replace(/[\u{2190}-\u{21FF}]/gu, "")
    .replace(/[\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{200D}]/gu, "")
    .replace(/[\u{20E3}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^\s+/, "")
    .trim();
}

function stripInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export async function downloadPdf(markdown: string, filename?: string) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (lineHeight: number) => {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      ensureSpace(20);
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      const codeText = stripEmojis(codeLines.join("\n"));
      const wrapped = doc.splitTextToSize(codeText, maxWidth - 16) as string[];
      const blockHeight = wrapped.length * 11 + 12;
      if (y + blockHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 4, maxWidth, blockHeight, "F");
      doc.setTextColor(40, 40, 40);
      wrapped.forEach((ln) => {
        doc.text(ln, margin + 8, y + 8);
        y += 11;
      });
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      continue;
    }

    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const h4 = line.match(/^####\s+(.+)$/);
    const h5 = line.match(/^#####\s+(.+)$/);

    if (h1) {
      const text = stripEmojis(stripInline(h1[1]));
      if (!text) continue;
      ensureSpace(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(15, 76, 60); // emerald-900-ish
      const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
      wrapped.forEach((ln) => {
        ensureSpace(24);
        doc.text(ln, margin, y);
        y += 24;
      });
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      continue;
    }
    if (h2) {
      const text = stripEmojis(stripInline(h2[1]));
      if (!text) continue;
      ensureSpace(22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 76, 60);
      const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
      wrapped.forEach((ln) => {
        ensureSpace(20);
        doc.text(ln, margin, y);
        y += 20;
      });
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      continue;
    }
    if (h3) {
      const text = stripEmojis(stripInline(h3[1]));
      if (!text) continue;
      ensureSpace(18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
      wrapped.forEach((ln) => {
        ensureSpace(16);
        doc.text(ln, margin, y);
        y += 16;
      });
      y += 2;
      doc.setFont("helvetica", "normal");
      continue;
    }
    if (h4) {
      const text = stripEmojis(stripInline(h4[1]));
      if (!text) continue;
      ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
      wrapped.forEach((ln) => {
        ensureSpace(14);
        doc.text(ln, margin, y);
        y += 14;
      });
      y += 2;
      doc.setFont("helvetica", "normal");
      continue;
    }
    if (h5) {
      const text = stripEmojis(stripInline(h5[1]));
      if (!text) continue;
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
      wrapped.forEach((ln) => {
        ensureSpace(13);
        doc.text(ln, margin, y);
        y += 13;
      });
      y += 2;
      doc.setFont("helvetica", "normal");
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      ensureSpace(12);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
      continue;
    }

    const quote = line.match(/^>\s*(.*)$/);
    if (quote) {
      const text = stripEmojis(stripInline(quote[1] || ""));
      if (!text) continue;
      ensureSpace(14);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      const wrapped = doc.splitTextToSize(text, maxWidth - 12) as string[];
      wrapped.forEach((ln, idx) => {
        ensureSpace(12);
        if (idx === 0) {
          doc.setDrawColor(16, 185, 129);
          doc.setLineWidth(2);
          doc.line(margin, y - 8, margin, y + 4);
        }
        doc.text(ln, margin + 8, y);
        y += 12;
      });
      y += 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ul) {
      const text = stripEmojis(stripInline(ul[1]));
      if (!text) continue;
      ensureSpace(14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      const wrapped = doc.splitTextToSize(text, maxWidth - 18) as string[];
      wrapped.forEach((ln, idx) => {
        ensureSpace(14);
        if (idx === 0) {
          doc.text("•", margin + 4, y);
        }
        doc.text(ln, margin + 16, y);
        y += 14;
      });
      continue;
    }

    const ol = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (ol) {
      const text = stripEmojis(stripInline(ol[2]));
      if (!text) continue;
      ensureSpace(14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      const wrapped = doc.splitTextToSize(text, maxWidth - 22) as string[];
      wrapped.forEach((ln, idx) => {
        ensureSpace(14);
        if (idx === 0) {
          doc.text(`${ol[1]}.`, margin, y);
        }
        doc.text(ln, margin + 22, y);
        y += 14;
      });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      y += 6;
      continue;
    }

    const cleanLine = stripEmojis(stripInline(line));
    if (!cleanLine) continue;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const wrapped = doc.splitTextToSize(cleanLine, maxWidth) as string[];
    wrapped.forEach((ln) => {
      ensureSpace(14);
      doc.text(ln, margin, y);
      y += 14;
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by Developer's Ai  -  Page ${p} of ${pageCount}`,
      margin,
      pageHeight - 16
    );
  }

  doc.save((filename ?? slugify(deriveTitle(markdown))) + ".pdf");
}

export async function downloadDocx(markdown: string, filename?: string) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
  } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];
  const lines = markdown.split("\n");

  const parseInline = (text: string): InstanceType<typeof TextRun>[] => {
    const runs: InstanceType<typeof TextRun>[] = [];
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) {
        runs.push(new TextRun({ text: text.slice(last, m.index) }));
      }
      if (m[2]) {
        runs.push(new TextRun({ text: m[2], bold: true }));
      } else if (m[3]) {
        runs.push(new TextRun({ text: m[3], italics: true }));
      } else if (m[4]) {
        runs.push(
          new TextRun({
            text: m[4],
            font: "Consolas",
            color: "C7254E",
            shading: { type: "clear", fill: "F9F2F4" },
          })
        );
      } else if (m[5]) {
        runs.push(
          new TextRun({
            text: m[5],
            color: "0F4C3C",
            underline: { type: "single" },
          })
        );
      }
      last = regex.lastIndex;
    }
    if (last < text.length) {
      runs.push(new TextRun({ text: text.slice(last) }));
    }
    return runs.length > 0 ? runs : [new TextRun({ text })];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeLines.join("\n"),
              font: "Consolas",
              size: 18,
              color: "333333",
            }),
          ],
          spacing: { before: 100, after: 200 },
          shading: { type: "clear", fill: "F5F5F5" },
        })
      );
      continue;
    }

    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const h4 = line.match(/^####\s+(.+)$/);

    if (h1) {
      children.push(
        new Paragraph({
          children: parseInline(h1[1]).map((r) => {
            return r;
          }),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 280, after: 140 },
        })
      );
      continue;
    }
    if (h2) {
      children.push(
        new Paragraph({
          children: parseInline(h2[1]),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }
    if (h3) {
      children.push(
        new Paragraph({
          children: parseInline(h3[1]),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }
    if (h4) {
      children.push(
        new Paragraph({
          children: parseInline(h4[1]),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 160, after: 80 },
        })
      );
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
          border: {
            bottom: { color: "CCCCCC", space: 1, style: "single", size: 6 },
          },
          spacing: { before: 100, after: 100 },
        })
      );
      continue;
    }

    const quote = line.match(/^>\s*(.*)$/);
    if (quote) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: quote[1] || "", italics: true, color: "555555" }),
          ],
          indent: { left: 360 },
          border: {
            left: { color: "10B981", space: 8, style: "single", size: 18 },
          },
          spacing: { before: 60, after: 60 },
        })
      );
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ul) {
      children.push(
        new Paragraph({
          children: parseInline(ul[1]),
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
        })
      );
      continue;
    }

    const ol = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (ol) {
      children.push(
        new Paragraph({
          children: parseInline(ol[2]),
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { before: 40, after: 40 },
        })
      );
      continue;
    }

    if (line.trim() === "") {
      children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
      continue;
    }

    children.push(
      new Paragraph({
        children: parseInline(line),
        spacing: { before: 60, after: 60 },
        alignment: AlignmentType.LEFT,
      })
    );
  }

  const doc = new Document({
    creator: "Developer's Ai",
    title: deriveTitle(markdown),
    description: "Generated by Developer's Ai",
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, (filename ?? slugify(deriveTitle(markdown))) + ".docx");
}
