import ExcelJS from 'exceljs';

/**
 * Generate an Excel (.xlsx) buffer from expense data.
 * @param {Array} expenses - Array of expense documents
 * @param {Object} options - { startDate, endDate }
 * @returns {Buffer} Excel file buffer
 */
export async function generateExcel(expenses, options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Expense Manager';
  workbook.created = new Date();

  // --- Main Sheet ---
  const sheet = workbook.addWorksheet('Expenses', {
    properties: { tabColor: { argb: '6366F1' } },
  });

  // Title
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Expense Report';
  titleCell.font = { size: 18, bold: true, color: { argb: '6366F1' } };
  titleCell.alignment = { horizontal: 'center' };

  // Date range
  sheet.mergeCells('A2:F2');
  const rangeCell = sheet.getCell('A2');
  const startStr = options.startDate
    ? new Date(options.startDate).toLocaleDateString('en-IN')
    : 'All time';
  const endStr = options.endDate
    ? new Date(options.endDate).toLocaleDateString('en-IN')
    : 'Present';
  rangeCell.value = `Period: ${startStr} — ${endStr}`;
  rangeCell.font = { size: 11, italic: true, color: { argb: '666666' } };
  rangeCell.alignment = { horizontal: 'center' };

  // Header row
  const headerRow = sheet.addRow([
    'Date',
    'Category',
    'Vendor',
    'Description',
    'Location',
    'Amount (₹)',
  ]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '6366F1' },
    };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: '333333' } },
    };
  });

  // Column widths
  sheet.getColumn(1).width = 14;
  sheet.getColumn(2).width = 24;
  sheet.getColumn(3).width = 24;
  sheet.getColumn(4).width = 36;
  sheet.getColumn(5).width = 18;
  sheet.getColumn(6).width = 16;

  // Data rows
  let totalAmount = 0;
  expenses.forEach((exp, i) => {
    const row = sheet.addRow([
      new Date(exp.date).toLocaleDateString('en-IN'),
      exp.category,
      exp.vendor || '-',
      exp.description,
      exp.location || '-',
      exp.amount,
    ]);

    totalAmount += exp.amount;

    // Alternate row color
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' },
        };
      });
    }

    // Format amount column
    row.getCell(6).numFmt = '#,##0.00';
    row.getCell(6).alignment = { horizontal: 'right' };
  });

  // Total row
  const totalRow = sheet.addRow(['', '', '', '', 'TOTAL', totalAmount]);
  totalRow.getCell(5).font = { bold: true, size: 12 };
  totalRow.getCell(6).font = { bold: true, size: 12, color: { argb: '6366F1' } };
  totalRow.getCell(6).numFmt = '₹#,##0.00';
  totalRow.getCell(6).alignment = { horizontal: 'right' };

  // --- Summary Sheet ---
  const summarySheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: '10B981' } },
  });

  summarySheet.mergeCells('A1:C1');
  const summaryTitle = summarySheet.getCell('A1');
  summaryTitle.value = 'Category Summary';
  summaryTitle.font = { size: 16, bold: true, color: { argb: '10B981' } };
  summaryTitle.alignment = { horizontal: 'center' };

  const summaryHeader = summarySheet.addRow(['Category', 'Count', 'Total (₹)']);
  summaryHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '10B981' },
    };
  });

  summarySheet.getColumn(1).width = 28;
  summarySheet.getColumn(2).width = 12;
  summarySheet.getColumn(3).width = 18;

  // Group by category
  const categoryMap = {};
  expenses.forEach((exp) => {
    if (!categoryMap[exp.category]) {
      categoryMap[exp.category] = { count: 0, total: 0 };
    }
    categoryMap[exp.category].count++;
    categoryMap[exp.category].total += exp.amount;
  });

  Object.entries(categoryMap)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, data]) => {
      const row = summarySheet.addRow([cat, data.count, data.total]);
      row.getCell(3).numFmt = '₹#,##0.00';
      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(2).alignment = { horizontal: 'center' };
    });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
