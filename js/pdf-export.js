/**
 * PDF export: generates a PDF of shifts and totals.
 */

import { payableHoursFromGross } from './calculations.js';

export function exportToPDF(els, setMessage, entries, rate, getDayName, parseTimeToMinutes, formatTime12Hour, fmtHours, fmtMoney, todayISO, filenameSuffix = "") {
  if (entries.length === 0) {
    setMessage("No shifts to export. Add some shifts first.", "err");
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Gross hours from all shifts; pay uses hours after tax allowance is excluded
    let totalHours = 0;
    entries.forEach(e => { totalHours += e.totalHours; });
    const pay = payableHoursFromGross(totalHours, rate);
    const totalEarned = pay.totalEarned;

    // Sort entries by date (descending) for PDF
    const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

    // Helper: Date | Clock in | Clock out | Total Hours | Earned (no Break column)
    function drawTableRow(doc, y, rowData, isHeader = false, dateWithDay = null) {
      const colWidths = [42, 35, 40, 32, 33];
      const startX = 14;
      let currentX = startX;
      const rowHeight = isHeader ? 12 : 9;
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);

      if (isHeader) {
        doc.setFillColor(241, 245, 249);
        doc.rect(startX, y, tableWidth, rowHeight, "F");
      }

      rowData.forEach((text, idx) => {
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(isHeader ? 10 : 9);
        doc.setFont(undefined, isHeader ? "bold" : "normal");

        if (idx === 0 && dateWithDay) {
          doc.setFontSize(9);
          doc.setFont(undefined, "normal");
          doc.setTextColor(15, 23, 42);
          doc.text(dateWithDay.date, currentX + 3, y + 4);
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(dateWithDay.day, currentX + 3, y + 8);
          doc.setTextColor(15, 23, 42);
        } else {
          doc.text(text, currentX + 3, y + 6, { align: "left" });
        }

        currentX += colWidths[idx];
      });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(startX, y + rowHeight, startX + tableWidth, y + rowHeight);

      return y + rowHeight + 1;
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

    // Table Header
    const headers = ["Date", "Clock in", "Clock out", "Total Hours", "Earned"];
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
        "", // Date handled via dateWithDay
        clockIn12,
        clockOut12,
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

    // Table total row: show ALL worked hours (gross) in the hours column
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(15, 23, 42);

    const colWidths = [42, 35, 40, 32, 33];
    const startX = 14;
    let currentX = startX;

    doc.text("Total (all hours)", currentX + 3, yPos + 6);
    currentX += colWidths[0];
    currentX += colWidths[1] + colWidths[2];

    const grossHoursX = currentX + colWidths[3] - 18;
    doc.text(fmtHours(pay.grossHours), grossHoursX, yPos + 6, { align: "right" });
    currentX += colWidths[3];

    const grossEarnedX = currentX + colWidths[4] - 18;
    doc.setFont(undefined, "normal");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text("see below", grossEarnedX, yPos + 6, { align: "right" });

    // Pay calculation box: gross → tax deduction → payable → earned
    yPos += 16;
    if (yPos > 230) {
      doc.addPage();
      currentPage++;
      yPos = 50;
    }

    const boxX = 14;
    const boxW = 182;
    const boxH = 54;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.rect(boxX, yPos, boxW, boxH, "FD");

    let lineY = yPos + 8;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Pay calculation", boxX + 6, lineY);

    lineY += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(51, 65, 85);

    const leftCol = boxX + 6;
    const rightCol = boxX + boxW - 6;

    doc.text("Total hours worked (all shifts)", leftCol, lineY);
    doc.text(fmtHours(pay.grossHours) + " hrs", rightCol, lineY, { align: "right" });

    lineY += 7;
    doc.text(`Less: tax hours (first ${pay.taxCap} hrs)`, leftCol, lineY);
    doc.text("−" + fmtHours(pay.taxHoursApplied) + " hrs", rightCol, lineY, { align: "right" });

    lineY += 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(leftCol, lineY, rightCol, lineY);

    lineY += 6;
    doc.setFont(undefined, "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Final payable hours", leftCol, lineY);
    doc.text(fmtHours(pay.payableHours) + " hrs", rightCol, lineY, { align: "right" });

    lineY += 7;
    doc.setFont(undefined, "normal");
    doc.setTextColor(51, 65, 85);
    doc.text("Hourly rate", leftCol, lineY);
    doc.text(fmtMoney(rate) + "/hr", rightCol, lineY, { align: "right" });

    lineY += 7;
    doc.setFont(undefined, "bold");
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text("Total earned (payable × rate)", leftCol, lineY);
    doc.text(fmtMoney(totalEarned), rightCol, lineY, { align: "right" });

    // Footer on each page
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Page ${i} of ${totalPages}`, 197, 285, { align: "right" });
    }

    // Save PDF
    const base = "clocky-shifts-" + todayISO();
    const fileName = filenameSuffix ? `${base}-${filenameSuffix}.pdf` : `${base}.pdf`;
    doc.save(fileName);

    setMessage("PDF exported successfully!");
  } catch (error) {
    console.error("PDF export error:", error);
    setMessage("Failed to export PDF. Please try again.", "err");
  }
}
