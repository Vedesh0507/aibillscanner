import { Router } from 'express';
import Expense from '../models/Expense.js';
import { generateExcel } from '../services/reportService.js';

const router = Router();

// GET /api/reports/excel — Download Excel report
router.get('/excel', async (req, res, next) => {
  try {
    const { startDate, endDate, category } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No expenses found for the selected filters',
      });
    }

    const buffer = await generateExcel(expenses, { startDate, endDate });

    const filename = `expense_report_${startDate || 'all'}_${endDate || 'present'}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/csv — Download CSV report
router.get('/csv', async (req, res, next) => {
  try {
    const { startDate, endDate, category } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No expenses found for the selected filters',
      });
    }

    // Build CSV
    const headers = 'Date,Category,Vendor,Description,Location,Amount (₹)\n';
    const rows = expenses
      .map((e) => {
        const date = new Date(e.date).toLocaleDateString('en-IN');
        const vendor = `"${(e.vendor || '').replace(/"/g, '""')}"`;
        const desc = `"${(e.description || '').replace(/"/g, '""')}"`;
        const loc = `"${(e.location || '').replace(/"/g, '""')}"`;
        return `${date},"${e.category}",${vendor},${desc},${loc},${e.amount}`;
      })
      .join('\n');

    const csv = headers + rows;
    const filename = `expense_report_${startDate || 'all'}_${endDate || 'present'}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;
