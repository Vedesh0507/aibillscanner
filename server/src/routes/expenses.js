import { Router } from 'express';
import Expense from '../models/Expense.js';
import { deleteImage } from '../services/cloudinaryService.js';

const router = Router();

// GET /api/expenses — List expenses with filters and pagination
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort(sort).skip(skip).limit(parseInt(limit)),
      Expense.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: expenses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/stats/summary — Dashboard summary stats
router.get('/stats/summary', async (req, res, next) => {
  try {
    const now = new Date();

    // Today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // This week (Monday start)
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = day === 0 ? 6 : day - 1; // Adjust for Monday
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // This year
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [todayTotal, weekTotal, monthTotal, yearTotal, totalCount] =
      await Promise.all([
        Expense.aggregate([
          { $match: { date: { $gte: todayStart } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        Expense.aggregate([
          { $match: { date: { $gte: weekStart } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        Expense.aggregate([
          { $match: { date: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        Expense.aggregate([
          { $match: { date: { $gte: yearStart } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        Expense.countDocuments(),
      ]);

    res.json({
      success: true,
      data: {
        today: {
          total: todayTotal[0]?.total || 0,
          count: todayTotal[0]?.count || 0,
        },
        week: {
          total: weekTotal[0]?.total || 0,
          count: weekTotal[0]?.count || 0,
        },
        month: {
          total: monthTotal[0]?.total || 0,
          count: monthTotal[0]?.count || 0,
        },
        year: {
          total: yearTotal[0]?.total || 0,
          count: yearTotal[0]?.count || 0,
        },
        totalExpenses: totalCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/stats/by-category — Category breakdown
router.get('/stats/by-category', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const result = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({
      success: true,
      data: result.map((r) => ({
        category: r._id,
        total: r.total,
        count: r.count,
        avgAmount: Math.round(r.avgAmount * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/stats/trend — Daily trend data
router.get('/stats/trend', async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    let dateFormat;
    if (groupBy === 'month') {
      dateFormat = '%Y-%m';
    } else if (groupBy === 'week') {
      dateFormat = '%Y-W%V';
    } else {
      dateFormat = '%Y-%m-%d';
    }

    const result = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: result.map((r) => ({
        date: r._id,
        total: r.total,
        count: r.count,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/:id — Get single expense
router.get('/:id', async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

// POST /api/expenses — Create expense
router.post('/', async (req, res, next) => {
  try {
    const expense = await Expense.create(req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

// PUT /api/expenses/:id — Update expense
router.put('/:id', async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/expenses/:id — Delete expense
router.delete('/:id', async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Delete receipt from Cloudinary if exists
    if (expense.receiptPublicId) {
      await deleteImage(expense.receiptPublicId);
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
