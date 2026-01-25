/**
 * PDF Export Functionality
 */

import * as Storage from './storage.js';
import * as Utils from './utils.js';

export function exportToPDF(els, setMessage, pruneOldEntries, loadEntries, loadHourlyRate, getDayName, parseTimeToMinutes, formatTime12Hour, fmtHours, fmtMoney, todayISO) {
  const entries = pruneOldEntries(loadEntries(), setMessage);
  const rate = loadHourlyRate();

  if (entries.length === 0) {
    setMessage(els, "No shifts to export. Add some shifts first.", "err");
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Calculate totals
    let totalHours = 0;
    entries.forEach(e => { totalHours += e.totalHours; });
    const totalEarned = totalHours * rate;

    // Sort entries by date (descending) for PDF
    const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

    // Helper function to draw a table row (matching second image with gray header)
    function drawTableRow(doc, y, rowData, isHeader = false, dateWithDay = null) {
      const colWidths = [35, 28, 28, 25, 30, 30];
      const startX = 14;
      let currentX = startX;
      const rowHeight = isHeader ? 12 : 9;

      // Header background (light gray like second image)
      if (isHeader) {
        doc.setFillColor(241, 245, 249); // slate-100 - light gray background
        doc.rect(startX, y, 182, rowHeight, "F");
      }

      // Draw cells (y is now the top of the row, text goes downward)
      rowData.forEach((text, idx) => {
        doc.setTextColor(15, 23, 42); // slate-900 for all text
        doc.setFontSize(isHeader ? 10 : 9);
        doc.setFont(undefined, isHeader ? "bold" : "normal");
        
        // All text left-aligned (matching second image)
        const align = "left";
        
        // Special handling for Date column with day name
        if (idx === 0 && dateWithDay) {
          doc.setFontSize(9);
          doc.setFont(undefined, "normal");
          doc.setTextColor(15, 23, 42);
          doc.text(dateWithDay.date, currentX + 3, y + 4);
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139); // slate-500 for day
          doc.text(dateWithDay.day, currentX + 3, y + 8);
          doc.setTextColor(15, 23, 42);
        } else {
          doc.text(text, currentX + 3, y + 6, { align });
        }
        
        currentX += colWidths[idx];
      });

      // Draw only horizontal line at bottom of row (subtle, no vertical borders)
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.3);
      doc.line(startX, y + rowHeight, startX + 182, y + rowHeight);

      return y + rowHeight + 1; // Return new y position for next row (add small spacing)
    }

    let currentPage = 1;
    let yPos = 20;

    // Dark Header Section (like the first image)
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 35, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("Cloky - Shift Report", 14, 15);

    // Subtitle
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    }) + " at " + now.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
    doc.text("Generated on " + dateStr, 14, 22);

    // Hourly rate badge (green rounded rectangle)
    if (rate > 0) {
      doc.setFillColor(34, 197, 94); // emerald-500
      doc.roundedRect(160, 8, 36, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.text("Rate: " + fmtMoney(rate) + "/hr", 178, 13, { align: "center" });
    }

    // Start table after header
    yPos = 50;

    // Table Header (matching web interface)
    const headers = ["Date", "Clock in", "Clock out", "Break", "Total Hours", "Earned"];
    yPos = drawTableRow(doc, yPos, headers, true);

    // Table Rows
    sortedEntries.forEach((e, idx) => {
      // Check if we need a new page BEFORE drawing the row
      if (yPos > 260) {
        doc.addPage();
        currentPage++;
        yPos = 50;

        // Redraw header on new page
        yPos = drawTableRow(doc, yPos, headers, true);
      }

      const dayName = getDayName(e.date);
      const earned = e.totalHours * rate;
      const overnight = (() => {
        try {
          const inM = parseTimeToMinutes(e.clockIn);
          const outM = parseTimeToMinutes(e.clockOut);
          return outM < inM;
        } catch { return false; }
      })();

      // Format times in 12-hour format
      const clockIn12 = formatTime12Hour(e.clockIn);
      const clockOut12 = formatTime12Hour(e.clockOut) + (overnight ? " (O/N)" : "");

      // Date with day combined (like web interface)
      const dateWithDay = {
        date: e.date,
        day: dayName
      };

      const rowData = [
        "", // Date will be handled separately with dateWithDay
        clockIn12,
        clockOut12,
        e.breakMin + " min",
        fmtHours(e.totalHours),
        fmtMoney(earned)
      ];

      yPos = drawTableRow(doc, yPos, rowData, false, dateWithDay);
    });

    // Add totals row at the bottom
    if (yPos > 260) {
      doc.addPage();
      currentPage++;
      yPos = 50;
    }

    // Draw a separator line before totals
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, yPos, 196, yPos);
    yPos += 5;

    // Totals row with bold text - align with data columns
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(15, 23, 42);
    
    // Column widths: [35, 28, 28, 25, 30, 30] - same as drawTableRow function
    const colWidths = [35, 28, 28, 25, 30, 30];
    const startX = 14;
    let currentX = startX;
    
    // "Total" label in first column (left-aligned like data)
    doc.text("Total", currentX + 3, yPos + 6);
    currentX += colWidths[0]; // Date column
    
    // Skip Clock in, Clock out, Break columns (empty)
    currentX += colWidths[1] + colWidths[2] + colWidths[3];
    
    // Total Hours (right-aligned within Total Hours column for better number alignment)
    const totalHoursX = currentX + colWidths[4] - 18; // Right edge of column minus padding
    doc.text(fmtHours(totalHours), totalHoursX, yPos + 6, { align: "right" });
    currentX += colWidths[4];
    
    // Total Earned (right-aligned within Earned column for better number alignment)
    const totalEarnedX = currentX + colWidths[5] - 18; // Right edge of column minus padding
    doc.text(fmtMoney(totalEarned), totalEarnedX, yPos + 6, { align: "right" });

    // Footer on each page
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Page ${i} of ${totalPages}`, 197, 285, { align: "right" });
    }

    // Save PDF
    const fileName = "clocky-shifts-" + todayISO() + ".pdf";
    doc.save(fileName);

    setMessage(els, "PDF exported successfully!");
  } catch (error) {
    console.error("PDF export error:", error);
    setMessage(els, "Failed to export PDF. Please try again.", "err");
  }
}
