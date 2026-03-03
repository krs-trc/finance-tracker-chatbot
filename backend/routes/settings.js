// routes/settings.js - User settings: daily allowance, saving goal, bills
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/settings - Get user's financial settings
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );

    // Return defaults if settings row doesn't exist
    const settings = result.rows[0] || {
      daily_allowance: 0,
      saving_goal: 0,
      saving_goal_label: 'Savings Goal',
    };

    res.json({ settings });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings.' });
  }
});

// PUT /api/settings - Update user's financial settings
router.put('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { daily_allowance, saving_goal, saving_goal_label } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, daily_allowance, saving_goal, saving_goal_label, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET daily_allowance = EXCLUDED.daily_allowance,
           saving_goal = EXCLUDED.saving_goal,
           saving_goal_label = EXCLUDED.saving_goal_label,
           updated_at = NOW()
       RETURNING *`,
      [userId, daily_allowance || 0, saving_goal || 0, saving_goal_label || 'Savings Goal']
    );

    res.json({ settings: result.rows[0] });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// GET /api/settings/bills - Get all upcoming bills
router.get('/bills', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM bills
       WHERE user_id = $1
       ORDER BY due_date ASC`,
      [userId]
    );

    res.json({ bills: result.rows });
  } catch (err) {
    console.error('Get bills error:', err);
    res.status(500).json({ error: 'Failed to get bills.' });
  }
});

// POST /api/settings/bills - Add a new bill
router.post('/bills', auth, async (req, res) => {
  const userId = req.user.id;
  const { label, amount, due_date } = req.body;

  if (!label || !amount || !due_date) {
    return res.status(400).json({ error: 'Label, amount, and due date are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO bills (user_id, label, amount, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, label, amount, due_date]
    );

    res.status(201).json({ bill: result.rows[0] });
  } catch (err) {
    console.error('Add bill error:', err);
    res.status(500).json({ error: 'Failed to add bill.' });
  }
});

// PUT /api/settings/bills/:id - Update a bill (e.g. mark as paid)
router.put('/bills/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { label, amount, due_date, is_paid } = req.body;

  try {
    const result = await pool.query(
      `UPDATE bills SET label = COALESCE($1, label), amount = COALESCE($2, amount),
       due_date = COALESCE($3, due_date), is_paid = COALESCE($4, is_paid)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [label, amount, due_date, is_paid, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    res.json({ bill: result.rows[0] });
  } catch (err) {
    console.error('Update bill error:', err);
    res.status(500).json({ error: 'Failed to update bill.' });
  }
});

// DELETE /api/settings/bills/:id - Delete a bill
router.delete('/bills/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM bills WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Bill deleted.' });
  } catch (err) {
    console.error('Delete bill error:', err);
    res.status(500).json({ error: 'Failed to delete bill.' });
  }
});

module.exports = router;