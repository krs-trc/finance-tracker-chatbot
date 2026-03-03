// src/components/SidebarWidgets.js
// Left sidebar: Daily Allowance, Upcoming Bills, Saving Goals
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './SidebarWidgets.css';

// ─── Daily Allowance Widget ──────────────────────────────────────────────────
function DailyAllowanceWidget({ settings, onSettingsUpdate }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(settings?.daily_allowance || 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(settings?.daily_allowance || 0);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings', {
        ...settings,
        daily_allowance: parseFloat(value),
      });
      onSettingsUpdate(res.data.settings);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save allowance:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="widget card" onClick={() => !editing && setEditing(true)}>
      <div className="widget-icon widget-icon-blue">💵</div>
      <div className="widget-content">
        <span className="widget-label">Daily Allowance</span>
        {editing ? (
          <div className="widget-edit" onClick={(e) => e.stopPropagation()}>
            <input
              className="widget-input"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <div className="widget-edit-actions">
              <button className="widget-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? '...' : 'Save'}
              </button>
              <button className="widget-cancel-btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="widget-value">${parseFloat(value).toFixed(2)}</span>
            <span className="widget-hint">Click to edit</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Upcoming Bills Widget ───────────────────────────────────────────────────
function UpcomingBillsWidget() {
  const [bills, setBills] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', amount: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await api.get('/settings/bills');
      setBills(res.data.bills);
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    }
  };

  const handleAddBill = async () => {
    if (!form.label || !form.amount || !form.due_date) return;
    setSaving(true);
    try {
      await api.post('/settings/bills', form);
      setForm({ label: '', amount: '', due_date: '' });
      setShowForm(false);
      fetchBills();
    } catch (err) {
      console.error('Failed to add bill:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaid = async (bill) => {
    try {
      await api.put(`/settings/bills/${bill.id}`, { is_paid: !bill.is_paid });
      fetchBills();
    } catch (err) {
      console.error('Failed to update bill:', err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/settings/bills/${id}`);
      fetchBills();
    } catch (err) {
      console.error('Failed to delete bill:', err);
    }
  };

  // Show only unpaid, upcoming bills
  const upcomingBills = bills
    .filter((b) => !b.is_paid)
    .slice(0, 3);

  return (
    <div className="widget card">
      <div className="widget-row">
        <div className="widget-icon widget-icon-red">📋</div>
        <div className="widget-content">
          <span className="widget-label">Upcoming Bills</span>
          {upcomingBills.length === 0 && (
            <span className="widget-empty">No upcoming bills</span>
          )}
        </div>
        <button className="widget-add-btn" onClick={() => setShowForm(!showForm)} title="Add bill">
          {showForm ? '✕' : '+'}
        </button>
      </div>

      {upcomingBills.length > 0 && (
        <ul className="bills-list">
          {upcomingBills.map((bill) => (
            <li key={bill.id} className="bill-item" onClick={() => handleTogglePaid(bill)}>
              <div className="bill-dot" />
              <div className="bill-info">
                <span className="bill-label">{bill.label}</span>
                <span className="bill-due">Due {new Date(bill.due_date).toLocaleDateString()}</span>
              </div>
              <div className="bill-right">
                <span className="bill-amount">${parseFloat(bill.amount).toFixed(2)}</span>
                <button className="bill-delete" onClick={(e) => handleDelete(bill.id, e)}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="widget-form">
          <input
            className="widget-input"
            placeholder="Bill name (e.g. Electricity)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <input
            className="widget-input"
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <input
            className="widget-input"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
          <button className="widget-save-btn full" onClick={handleAddBill} disabled={saving}>
            {saving ? 'Adding...' : 'Add Bill'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Saving Goals Widget ─────────────────────────────────────────────────────
function SavingGoalsWidget({ settings, totalBalance, onSettingsUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    saving_goal: settings?.saving_goal || 0,
    saving_goal_label: settings?.saving_goal_label || 'Savings Goal',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      saving_goal: settings?.saving_goal || 0,
      saving_goal_label: settings?.saving_goal_label || 'Savings Goal',
    });
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings', {
        ...settings,
        saving_goal: parseFloat(form.saving_goal),
        saving_goal_label: form.saving_goal_label,
      });
      onSettingsUpdate(res.data.settings);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const goal = parseFloat(form.saving_goal) || 0;
  const balance = parseFloat(totalBalance) || 0;
  const progress = goal > 0 ? Math.min((balance / goal) * 100, 100) : 0;

  return (
    <div className="widget card" onClick={() => !editing && setEditing(true)}>
      <div className="widget-row">
        <div className="widget-icon widget-icon-green">🎯</div>
        <div className="widget-content">
          <span className="widget-label">{form.saving_goal_label || 'Savings Goal'}</span>
        </div>
      </div>

      {editing ? (
        <div className="widget-form" onClick={(e) => e.stopPropagation()}>
          <input
            className="widget-input"
            placeholder="Goal name (e.g. Vacation Fund)"
            value={form.saving_goal_label}
            onChange={(e) => setForm({ ...form, saving_goal_label: e.target.value })}
          />
          <input
            className="widget-input"
            type="number"
            placeholder="Target amount"
            value={form.saving_goal}
            onChange={(e) => setForm({ ...form, saving_goal: e.target.value })}
          />
          <div className="widget-edit-actions">
            <button className="widget-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? '...' : 'Save'}
            </button>
            <button className="widget-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="goal-progress-wrap">
          <div className="goal-amounts">
            <span className="goal-current">${balance.toFixed(2)}</span>
            <span className="goal-target">/ ${goal.toFixed(2)}</span>
          </div>
          <div className="goal-bar">
            <div
              className="goal-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="goal-percent">{progress.toFixed(0)}% reached</span>
          <span className="widget-hint">Click to edit goal</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function SidebarWidgets({ totalBalance }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data.settings);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  return (
    <div className="sidebar-widgets">
      <DailyAllowanceWidget settings={settings} onSettingsUpdate={setSettings} />
      <UpcomingBillsWidget />
      <SavingGoalsWidget
        settings={settings}
        totalBalance={totalBalance}
        onSettingsUpdate={setSettings}
      />
    </div>
  );
}
