// routes/transactions.js - Log and retrieve transactions
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/transactions - Log a new expense or income
router.post('/', auth, async (req, res) => {
  const { type, amount, category, description, transaction_date } = req.body;
  const userId = req.user.id;

  if (!type || !amount) {
    return res.status(400).json({ error: 'Type and amount are required.' });
  }

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type must be "income" or "expense".' });
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, category, description, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, amount, category || 'General', description || '', transaction_date || new Date()]
    );

    res.status(201).json({ transaction: result.rows[0] });
  } catch (err) {
    console.error('Log transaction error:', err);
    res.status(500).json({ error: 'Failed to log transaction.' });
  }
});

// GET /api/transactions - Get all transactions for the user (with optional filters)
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { month, year, type, limit = 50 } = req.query;

  let query = `SELECT * FROM transactions WHERE user_id = $1`;
  const params = [userId];
  let paramCount = 1;

  if (month && year) {
    paramCount++;
    query += ` AND EXTRACT(MONTH FROM transaction_date) = $${paramCount}`;
    params.push(month);
    paramCount++;
    query += ` AND EXTRACT(YEAR FROM transaction_date) = $${paramCount}`;
    params.push(year);
  }

  if (type) {
    paramCount++;
    query += ` AND type = $${paramCount}`;
    params.push(type);
  }

  query += ` ORDER BY transaction_date DESC, created_at DESC`;
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(limit);

  try {
    const result = await pool.query(query, params);
    res.json({ transactions: result.rows });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

// GET /api/transactions/summary - Quick summary (today, this week, this month)
router.get('/summary', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT
        -- Today's totals
        COALESCE(SUM(CASE WHEN type = 'income' AND transaction_date = CURRENT_DATE THEN amount END), 0) AS today_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND transaction_date = CURRENT_DATE THEN amount END), 0) AS today_expense,

        -- This month's totals
        COALESCE(SUM(CASE WHEN type = 'income' AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount END), 0) AS month_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount END), 0) AS month_expense,

        -- All-time balance
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS total_balance

      FROM transactions WHERE user_id = $1`,
      [userId]
    );

    res.json({ summary: result.rows[0] });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to get summary.' });
  }
});

// GET /api/transactions/monthly-report - Detailed monthly breakdown
router.get('/monthly-report', auth, async (req, res) => {
  const userId = req.user.id;
  const { month, year } = req.query;

  const targetMonth = month || new Date().getMonth() + 1;
  const targetYear = year || new Date().getFullYear();

  try {
    // Overall totals for the month
    const totals = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS total_expense,
        COUNT(*) AS transaction_count
      FROM transactions
      WHERE user_id = $1
        AND EXTRACT(MONTH FROM transaction_date) = $2
        AND EXTRACT(YEAR FROM transaction_date) = $3`,
      [userId, targetMonth, targetYear]
    );

    // Spending by category
    const byCategory = await pool.query(
      `SELECT category, SUM(amount) AS total, COUNT(*) AS count
      FROM transactions
      WHERE user_id = $1
        AND type = 'expense'
        AND EXTRACT(MONTH FROM transaction_date) = $2
        AND EXTRACT(YEAR FROM transaction_date) = $3
      GROUP BY category
      ORDER BY total DESC`,
      [userId, targetMonth, targetYear]
    );

    // All transactions that month
    const transactions = await pool.query(
      `SELECT * FROM transactions
      WHERE user_id = $1
        AND EXTRACT(MONTH FROM transaction_date) = $2
        AND EXTRACT(YEAR FROM transaction_date) = $3
      ORDER BY transaction_date DESC`,
      [userId, targetMonth, targetYear]
    );

    res.json({
      month: targetMonth,
      year: targetYear,
      totals: totals.rows[0],
      byCategory: byCategory.rows,
      transactions: transactions.rows,
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'Failed to generate monthly report.' });
  }
});

module.exports = router;