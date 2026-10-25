/**
 * ABHEDYA Professional Incident Report PDF Generator
 * Supports English, Hindi, and Marathi with full Devanagari script rendering.
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Helper to render text into a canvas with Devanagari fonts so glyphs and conjuncts render crisply
function renderDevanagariToImage(text, options = {}) {
  const {
    fontSize = 14,
    color = '#0f172a',
    fontWeight = 'normal',
    maxWidth = 500,
    lineHeight = 22,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = maxWidth * 2; // High DPI
  ctx.scale(2, 2);

  ctx.font = `${fontWeight} ${fontSize}px 'Noto Sans Devanagari', 'Inter', sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  // Simple multi-line text wrapping
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  canvas.height = (lines.length * lineHeight + 10) * 2;
  ctx.scale(2, 2); // reset scale for height adjustment
  ctx.font = `${fontWeight} ${fontSize}px 'Noto Sans Devanagari', 'Inter', sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  lines.forEach((line, index) => {
    ctx.fillText(line, 0, index * lineHeight);
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: maxWidth,
    height: lines.length * lineHeight + 10,
  };
}

export async function generateIncidentPdf(reportData, t) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = margin;

  // 1. Header Banner
  doc.setFillColor(8, 12, 20); // Dark navy header
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(6, 182, 212); // Cyan
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ABHEDYA', margin, 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('PROTECT. PROVE. PREVAIL. — DIGITAL SAFETY WORKSPACE', margin, 20);

  doc.setFontSize(8);
  doc.setTextColor(244, 63, 94); // Rose
  doc.text('OFFICIAL DIGITAL SAFETY INCIDENT REPORT — VERIFIABLE RECORD', pageWidth - margin, 14, { align: 'right' });

  doc.setTextColor(148, 163, 184);
  doc.text(`ID: ${reportData.id}`, pageWidth - margin, 20, { align: 'right' });

  currentY = 40;

  // 2. Incident Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INCIDENT METRICS & CLASSIFICATION', margin + 4, currentY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Platform: ${reportData.platform.toUpperCase()}`, margin + 4, currentY + 14);
  doc.text(`Incident Type: ${reportData.incidentType.toUpperCase()}`, margin + 4, currentY + 20);
  doc.text(`Recorded Date: ${reportData.dateTime}`, margin + 80, currentY + 14);
  doc.text(`Generated At: ${new Date().toISOString()}`, margin + 80, currentY + 20);

  currentY += 34;

  // 3. Creator Safety Score Indicator at Incident Time
  if (reportData.safetyScore !== undefined) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`ABHEDYA Safety Score at Filing: ${reportData.safetyScore}/100 (${reportData.safetyBand.toUpperCase()})`, margin + 4, currentY + 9);
    currentY += 18;
  }

  // 4. Creator Situation Statement (Rendered cleanly to support English, Hindi, and Marathi)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. STATEMENT OF INCIDENT (USER SUBMITTED)', margin, currentY);
  currentY += 5;

  const statementImg = renderDevanagariToImage(
    reportData.description || 'No detailed description submitted.',
    { fontSize: 11, maxWidth: 500, color: '#334155' }
  );

  const imgHeightMm = (statementImg.height * (contentWidth / 500)) * 0.264583;
  doc.addImage(statementImg.dataUrl, 'PNG', margin, currentY, contentWidth, Math.min(imgHeightMm, 55));
  currentY += Math.min(imgHeightMm, 55) + 8;

  // 5. Attached Verifiable Evidence Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. ATTACHED TECHNICAL EVIDENCE LEDGER', margin, currentY);
  currentY += 4;

  const tableRows = (reportData.attachedRecords || []).map((rec, idx) => {
    return [
      `#${idx + 1} (${rec.type.toUpperCase()})`,
      rec.id || 'N/A',
      rec.timestamp?.substring(0, 16) || 'N/A',
      rec.originalHash ? `Orig: ${rec.originalHash.substring(0, 12)}...\nProt: ${rec.protectedHash?.substring(0, 12) || 'N/A'}...` : (rec.summary || 'Recorded Signal')
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push(['No Module Records Attached', '-', '-', 'No individual records selected.']);
  }

  doc.autoTable({
    startY: currentY,
    head: [['Module Type', 'Record ID', 'Timestamp', 'Cryptographic Proof / Findings']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [51, 65, 85] },
    margin: { left: margin, right: margin },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // Check page overflow
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = margin;
  }

  // 6. Evidence Visualization Thumbnail (if available)
  if (reportData.previewImage) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('3. EVIDENCE VISUALIZATION PREVIEW', margin, currentY);
    currentY += 4;

    try {
      doc.addImage(reportData.previewImage, 'PNG', margin, currentY, 65, 45);
      currentY += 50;
    } catch {
      // If thumbnail fails to add, continue gracefully
    }
  }

  // 7. Recommended Next Steps
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. RECOMMENDED NEXT STEPS', margin, currentY);
  currentY += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('• Preserve this PDF along with original uncompressed media files in a secure drive.', margin, currentY);
  doc.text('• Submit this incident package to the official Cyber Crime Cell (cybercrime.gov.in) or platform safety support.', margin, currentY + 4);
  doc.text('• For direct threats or blackmail, seek urgent advice from local legal counsel or safety advocates.', margin, currentY + 8);
  currentY += 16;

  // 8. Mandatory Advisory & Legal Disclaimer
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, pageHeight - 28, contentWidth, 20, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('ADVISORY & LEGAL DISCLAIMER', margin + 3, pageHeight - 22);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const disclaimerText = 'This document compiles user-provided statements, cryptographic SHA-256 hashes, and automated algorithmic signals generated in ABHEDYA. It is designed to assist law enforcement, legal counsel, and platform safety teams. ABHEDYA does not independently verify physical identities or issue judicial rulings.';
  doc.text(doc.splitTextToSize(disclaimerText, contentWidth - 6), margin + 3, pageHeight - 17);

  // Return download
  const filename = `ABHEDYA_Incident_Report_${reportData.id}.pdf`;
  doc.save(filename);
  return { success: true, filename };
}
