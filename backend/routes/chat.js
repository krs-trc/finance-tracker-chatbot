// routes/chat.js - Chatbot message processing
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

// Parse natural language to extract transaction details
function parseTransactionMessage(message) {
  const lower = message.toLowerCase();

  // Determine type
  const isExpense = /spent|paid|bought|purchased|expense|cost|bill|owe|charged|pay/i.test(lower);
  const isIncome = /earned|received|got paid|salary|income|revenue|bonus|deposit|receive/i.test(lower);

  if (!isExpense && !isIncome) return null;

  // Extract amount (supports: $50, 50.00, RM 50, 50 dollars)
  const amountMatch = lower.match(/(?:rm\s*|[$€£¥]?\s*)(\d+(?:[.,]\d{1,2})?)/);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(',', '.'));

  // Extract category hints
  const categories = {
    food: /food|meal|lunch|dinner|breakfast|cafe|restaurant|coffee|snack|groceries|grocery/,
    transport: /transport|grab|uber|taxi|bus|train|mrt|commute|fuel|petrol|gas|parking/,
    shopping: /shopping|clothes|shoes|amazon|online|purchase/,
    entertainment: /movie|cinema|netflix|spotify|game|subscription|entertainment/,
    health: /doctor|medicine|hospital|pharmacy|gym|health/,
    utilities: /electricity|water|internet|phone|bill|utility/,
    rent: /rent|housing|mortgage/,
    salary: /salary|paycheck|payslip/,
    freelance: /freelance|project|client/,
  };

  let category = 'General';
  for (const [cat, pattern] of Object.entries(categories)) {
    if (pattern.test(lower)) {
      category = cat.charAt(0).toUpperCase() + cat.slice(1);
      break;
    }
  }

  // Extract description (everything that isn't amount-related)
  const description = message.trim();

  return {
    type: isExpense ? 'expense' : 'income',
    amount,
    category,
    description,
  };
}

// Format currency
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

// Format month name
function getMonthName(month) {
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  return months[parseInt(month) - 1] || 'Unknown';
}

// ─── Route ──────────────────────────────────────────────────────────────────

// POST /api/chat - Process a chat message and return a bot response
router.post('/', auth, async (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;
  const userName = req.user.name;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const lower = message.toLowerCase().trim();

  try {
    // ── COMMAND: Monthly Report ──────────────────────────────────────────
    if (/monthly report|report for|show report|monthly summary/.test(lower)) {
      // Extract optional month/year from message
      const now = new Date();
      let month = now.getMonth() + 1;
      let year = now.getFullYear();

      const monthMatch = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
      if (monthMatch) {
        const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        month = monthNames.indexOf(monthMatch[1]) + 1;
      }

      const totals = await pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS total_expense
        FROM transactions
        WHERE user_id = $1
          AND EXTRACT(MONTH FROM transaction_date) = $2
          AND EXTRACT(YEAR FROM transaction_date) = $3`,
        [userId, month, year]
      );

      const byCategory = await pool.query(
        `SELECT category, SUM(amount) AS total
        FROM transactions
        WHERE user_id = $1 AND type = 'expense'
          AND EXTRACT(MONTH FROM transaction_date) = $2
          AND EXTRACT(YEAR FROM transaction_date) = $3
        GROUP BY category ORDER BY total DESC LIMIT 5`,
        [userId, month, year]
      );

      const { total_income, total_expense } = totals.rows[0];
      const net = parseFloat(total_income) - parseFloat(total_expense);
      const monthName = getMonthName(month);

      let reportText = `📊 **${monthName} ${year} Report**\n\n`;
      reportText += `💰 Total Income: **${formatCurrency(total_income)}**\n`;
      reportText += `💸 Total Expenses: **${formatCurrency(total_expense)}**\n`;
      reportText += `📈 Net Balance: **${net >= 0 ? '+' : ''}${formatCurrency(net)}**\n\n`;

      if (byCategory.rows.length > 0) {
        reportText += `🗂️ **Top Spending Categories:**\n`;
        byCategory.rows.forEach((row, i) => {
          reportText += `${i + 1}. ${row.category}: ${formatCurrency(row.total)}\n`;
        });
      } else {
        reportText += `No expenses recorded for ${monthName}.`;
      }

      if (net < 0) {
        reportText += `\n\n⚠️ You spent more than you earned this month. Consider reviewing your expenses.`;
      } else if (net > 0) {
        reportText += `\n\n✅ Great job! You saved ${formatCurrency(net)} this month.`;
      }

      return res.json({ reply: reportText, type: 'report' });
    }

    // ── COMMAND: Quick Summary ───────────────────────────────────────────
    if (/summary|how am i doing|balance|overview|status|spending|how much/.test(lower)) {
      const result = await pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'income' AND transaction_date = CURRENT_DATE THEN amount END), 0) AS today_income,
          COALESCE(SUM(CASE WHEN type = 'expense' AND transaction_date = CURRENT_DATE THEN amount END), 0) AS today_expense,
          COALESCE(SUM(CASE WHEN type = 'income' AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount END), 0) AS month_income,
          COALESCE(SUM(CASE WHEN type = 'expense' AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount END), 0) AS month_expense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS total_balance
        FROM transactions WHERE user_id = $1`,
        [userId]
      );

      const s = result.rows[0];
      const todayNet = parseFloat(s.today_income) - parseFloat(s.today_expense);
      const monthNet = parseFloat(s.month_income) - parseFloat(s.month_expense);

      const reply = `👋 Here's your financial summary, ${userName}!\n\n` +
        `📅 **Today**\n` +
        `  Income: ${formatCurrency(s.today_income)}  |  Expenses: ${formatCurrency(s.today_expense)}\n` +
        `  Net: ${todayNet >= 0 ? '+' : ''}${formatCurrency(todayNet)}\n\n` +
        `📆 **This Month**\n` +
        `  Income: ${formatCurrency(s.month_income)}  |  Expenses: ${formatCurrency(s.month_expense)}\n` +
        `  Net: ${monthNet >= 0 ? '+' : ''}${formatCurrency(monthNet)}\n\n` +
        `🏦 **Overall Balance:** ${formatCurrency(s.total_balance)}\n\n` +
        `Type "monthly report" for a full breakdown, or log a new transaction!`;

      return res.json({ reply, type: 'summary' });
    }

    // ── COMMAND: Help ────────────────────────────────────────────────────
    if (/help|what can you do|commands|how to use/.test(lower)) {
      const reply = `🤖 **Here's what I can do:**\n\n` +
        `💸 **Log Expense:**\n  "Spent $25 on lunch"\n  "Paid $100 for electricity bill"\n\n` +
        `💰 **Log Income:**\n  "Received $2000 salary"\n  "Earned $500 from freelance"\n\n` +
        `📊 **Quick Summary:**\n  "Show my summary"\n  "How am I doing?"\n\n` +
        `📋 **Monthly Report:**\n  "Monthly report"\n  "Report for March"\n\n` +
        `Just type naturally — I'll figure it out! 😊`;

      return res.json({ reply, type: 'help' });
    }

    // ── COMMAND: Log Transaction (natural language) ──────────────────────
    const parsed = parseTransactionMessage(message);

    if (parsed) {
      const { type, amount, category, description } = parsed;

      // Save transaction to database
      const result = await pool.query(
        `INSERT INTO transactions (user_id, type, amount, category, description, transaction_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
         RETURNING *`,
        [userId, type, amount, category, description]
      );

      const emoji = type === 'expense' ? '💸' : '💰';
      const action = type === 'expense' ? 'expense' : 'income';

      const reply = `${emoji} Got it! I've logged your ${action}:\n\n` +
        `  Amount: **${formatCurrency(amount)}**\n` +
        `  Category: **${category}**\n` +
        `  Date: **Today**\n\n` +
        `Type "summary" to see your balance, or keep logging!`;

      return res.json({ reply, type: 'transaction_logged', transaction: result.rows[0] });
    }

    // ── DEFAULT: Unrecognized ────────────────────────────────────────────
    const reply = `🤔 I didn't quite catch that. Here are some things you can try:\n\n` +
      `• "Spent $30 on groceries"\n` +
      `• "Received $1500 salary"\n` +
      `• "Show my summary"\n` +
      `• "Monthly report"\n\n` +
      `Type **"help"** to see all commands!`;

    res.json({ reply, type: 'unknown' });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process message.' });
  }
});

module.exports = router;