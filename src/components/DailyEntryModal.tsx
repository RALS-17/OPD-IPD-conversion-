import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { X, Plus, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { DailyEntryRowInput, PhysicianDailyEntry } from '../lib/physicianDailyEntries';

export interface DailyEntrySavePayload {
  date: string;
  rows: DailyEntryRowInput[];
  /** Names typed as new doctors (to be added to the roster) */
  newDoctors: string[];
}

interface DailyEntryModalProps {
  initialDate: string;
  rosterNames: string[];
  entries: PhysicianDailyEntry[];
  onClose: () => void;
  onSave: (payload: DailyEntrySavePayload) => Promise<void>;
}

type CellKey = 'total' | 'pHmo' | 'pCash' | 'wHmo' | 'wCash';

interface GridRow {
  id: string;
  name: string;
  isNew: boolean;
  total: string;
  pHmo: string;
  pCash: string;
  wHmo: string;
  wCash: string;
}

const COLS: { key: CellKey; label: string; sub?: string }[] = [
  { key: 'total', label: 'Total OPD Consults' },
  { key: 'pHmo', label: 'Private', sub: 'HMO' },
  { key: 'pCash', label: 'Private', sub: 'CASH' },
  { key: 'wHmo', label: 'Walk-in', sub: 'HMO' },
  { key: 'wCash', label: 'Walk-in', sub: 'CASH' },
];

const SPLIT_KEYS: CellKey[] = ['pHmo', 'pCash', 'wHmo', 'wCash'];

let rowSeq = 0;
const nextId = () => `r${++rowSeq}`;

const digits = (v: string) => v.replace(/\D/g, '').slice(0, 7);
const num = (v: string) => (v === '' ? 0 : parseInt(v, 10));

function buildRows(
  date: string,
  rosterNames: string[],
  entries: PhysicianDailyEntry[]
): GridRow[] {
  const byName = new Map<string, PhysicianDailyEntry>();
  const names = new Set<string>();
  rosterNames.forEach((n) => n.trim() && names.add(n.trim()));
  entries.forEach((e) => {
    names.add(e.physician);
    if (e.date === date) byName.set(e.physician, e);
  });
  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const e = byName.get(name);
      return {
        id: nextId(),
        name,
        isNew: false,
        total: e ? String(e.totalOpd) : '',
        pHmo: e ? String(e.privateHmo) : '',
        pCash: e ? String(e.privateCash) : '',
        wHmo: e ? String(e.walkInHmo) : '',
        wCash: e ? String(e.walkInCash) : '',
      };
    });
}

const snapshot = (rows: GridRow[]) =>
  JSON.stringify(rows.map(({ id: _id, ...rest }) => rest));

function rowHasValues(r: GridRow) {
  return r.total !== '' || SPLIT_KEYS.some((k) => r[k] !== '');
}

function rowSplitSum(r: GridRow) {
  return SPLIT_KEYS.reduce((sum, k) => sum + num(r[k]), 0);
}

export default function DailyEntryModal({
  initialDate,
  rosterNames,
  entries,
  onClose,
  onSave,
}: DailyEntryModalProps) {
  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState<GridRow[]>(() =>
    buildRows(initialDate, rosterNames, entries)
  );
  const baseline = useRef(snapshot(rows));
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const dirty = snapshot(rows) !== baseline.current;

  const loadDate = (nextDate: string) => {
    const next = buildRows(nextDate, rosterNames, entries);
    baseline.current = snapshot(next);
    setRows(next);
    setSaveError(null);
  };

  const handleDateChange = (value: string) => {
    if (value === date) return;
    if (dirty && !window.confirm('Discard the unsaved changes for this date?')) return;
    setDate(value);
    if (value) loadDate(value);
  };

  const handleClose = () => {
    if (dirty && !window.confirm('Close without saving? Your changes will be lost.')) return;
    onClose();
  };

  const setCell = (id: string, key: CellKey | 'name', value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, [key]: key === 'name' ? value : digits(value) } : r
      )
    );
    setSaveError(null);
  };

  const addDoctorRow = () => {
    const id = nextId();
    setSearch('');
    setRows((prev) => [
      ...prev,
      { id, name: '', isNew: true, total: '', pHmo: '', pCash: '', wHmo: '', wCash: '' },
    ]);
    setTimeout(() => {
      const el = gridRef.current?.querySelector<HTMLInputElement>(
        `[data-cell="${id}:name"]`
      );
      el?.scrollIntoView({ block: 'nearest' });
      el?.focus();
    }, 30);
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  /* Rows currently shown (search never hides rows that still need attention) */
  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () => rows.filter((r) => r.isNew || !q || r.name.toLowerCase().includes(q)),
    [rows, q]
  );

  /* Validation */
  const problems = useMemo(() => {
    const map = new Map<string, string>();
    const seen = new Map<string, string>();
    rows.forEach((r) => {
      const name = r.name.trim();
      const key = name.toLowerCase();
      if (r.isNew && !name) {
        if (rowHasValues(r)) map.set(r.id, 'Enter the doctor name');
        return;
      }
      if (name) {
        if (seen.has(key)) {
          map.set(r.id, 'Duplicate doctor name');
          return;
        }
        seen.set(key, r.id);
      }
      if (!rowHasValues(r)) return;
      const sum = rowSplitSum(r);
      if (r.total !== '' && num(r.total) !== sum) {
        map.set(r.id, `Total ${num(r.total)} ≠ split ${sum}`);
      } else if (r.total === '' && sum === 0) {
        map.set(r.id, 'Enter the values');
      }
    });
    return map;
  }, [rows]);

  const dayTotal = rows.reduce((sum, r) => {
    if (!rowHasValues(r)) return sum;
    return sum + (r.total !== '' ? num(r.total) : rowSplitSum(r));
  }, 0);

  const filledCount = rows.filter(rowHasValues).length;
  const savedForDate = useMemo(
    () => entries.filter((e) => e.date === date).length,
    [entries, date]
  );

  /* Excel-like navigation */
  const focusCell = (id: string, key: CellKey) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${id}:${key}"]`);
    if (el) {
      el.focus();
      el.select?.();
    }
  };

  const onCellKeyDown = (
    e: ReactKeyboardEvent<HTMLInputElement>,
    rowId: string,
    colIdx: number
  ) => {
    const vIdx = visible.findIndex((r) => r.id === rowId);
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const next = visible[vIdx + 1];
      if (next) focusCell(next.id, COLS[colIdx].key);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = visible[vIdx - 1];
      if (prev) focusCell(prev.id, COLS[colIdx].key);
    } else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      if (colIdx < COLS.length - 1) {
        e.preventDefault();
        focusCell(rowId, COLS[colIdx + 1].key);
      }
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionEnd === 0) {
      if (colIdx > 0) {
        e.preventDefault();
        focusCell(rowId, COLS[colIdx - 1].key);
      }
    }
  };

  /* Paste a block copied from Excel / Sheets (tab + newline separated) */
  const onCellPaste = (
    e: ClipboardEvent<HTMLInputElement>,
    rowId: string,
    colIdx: number
  ) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n\r]/.test(text.trim())) return; // single value → normal paste
    e.preventDefault();
    const lines = text.replace(/\r/g, '').split('\n');
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    const startV = visible.findIndex((r) => r.id === rowId);
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      lines.forEach((line, li) => {
        const target = visible[startV + li];
        if (!target) return;
        const row = next.find((r) => r.id === target.id);
        if (!row) return;
        line.split('\t').forEach((cell, ci) => {
          const col = COLS[colIdx + ci];
          if (col) row[col.key] = digits(cell.trim());
        });
      });
      return next;
    });
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!date) {
      setSaveError('Choose the date for these entries.');
      return;
    }
    if (problems.size > 0) {
      setSaveError('Fix the rows marked in red before saving.');
      return;
    }
    const payloadRows: DailyEntryRowInput[] = [];
    const newDoctors: string[] = [];
    rows.forEach((r) => {
      const name = r.name.trim();
      if (!name) return;
      if (r.isNew) newDoctors.push(name);
      if (!rowHasValues(r)) {
        // Blank on an existing doctor clears that doctor's entry for the date
        if (!r.isNew) payloadRows.push({ physician: name, values: null });
        return;
      }
      const sum = rowSplitSum(r);
      payloadRows.push({
        physician: name,
        values: {
          totalOpd: r.total !== '' ? num(r.total) : sum,
          privateHmo: num(r.pHmo),
          privateCash: num(r.pCash),
          walkInHmo: num(r.wHmo),
          walkInCash: num(r.wCash),
        },
      });
    });

    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ date, rows: payloadRows, newDoctors });
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save. Nothing was changed.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Esc asks before closing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cellInput =
    'w-full h-7 px-1.5 text-right text-[11.5px] tabular-nums border border-transparent bg-transparent rounded-sm hover:border-slate-300 focus:outline-none focus:border-[#1348f3] focus:bg-white focus:ring-1 focus:ring-[#1348f3]/30';

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/50" />
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-lg border border-slate-200 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Edit daily entries"
      >
        {/* Header */}
        <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="mr-auto">
            <h2 className="text-[14px] font-bold text-slate-900 leading-tight">
              Edit Daily Entries
            </h2>
            <p className="text-[10.5px] text-slate-500 leading-tight mt-0.5">
              Enter the values for this one day. They are added to the totals of the
              period shown on the Physician Summary.
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            Entry date
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-8 text-[12px] border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
            />
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctor…"
            className="h-8 w-[150px] px-2.5 text-[11px] border border-slate-200 rounded-md bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info strip */}
        <div className="shrink-0 px-4 py-1.5 bg-slate-50/80 border-b border-slate-100 text-[10.5px] text-slate-500 flex flex-wrap gap-x-4 gap-y-0.5">
          <span>
            {savedForDate > 0
              ? `${savedForDate} doctor(s) already have entries on this date — saving replaces them.`
              : 'No entries saved yet for this date.'}
          </span>
          <span>
            Total OPD must equal Private HMO + Private CASH + Walk-in HMO + Walk-in CASH.
            Leave Total blank to auto-fill. Clear a row to remove that day’s entry.
          </span>
          <span>Arrow keys / Enter move between cells · you can paste from Excel.</span>
        </div>

        {/* Grid */}
        <div ref={gridRef} className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-[11.5px] border-collapse">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-semibold text-[10px] min-w-[220px]">
                  Physician
                </th>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className="px-2 py-1.5 text-right font-semibold text-[10px] w-[96px]"
                  >
                    {c.label}
                    {c.sub && (
                      <span className="block text-[9.5px] font-medium text-[#1348f3]">
                        {c.sub}
                      </span>
                    )}
                  </th>
                ))}
                <th className="px-2 py-2 text-left font-semibold text-[10px] w-[150px]">
                  Check
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    No doctors match your search.
                  </td>
                </tr>
              )}
              {visible.map((r, idx) => {
                const problem = problems.get(r.id);
                const filled = rowHasValues(r);
                const sum = rowSplitSum(r);
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 ${
                      problem
                        ? 'bg-red-50'
                        : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50'
                    }`}
                  >
                    <td className="px-3 py-0.5">
                      {r.isNew ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            data-cell={`${r.id}:name`}
                            value={r.name}
                            onChange={(e) => setCell(r.id, 'name', e.target.value)}
                            placeholder="New doctor name, e.g. Dr. Juan Santos"
                            className="h-7 flex-1 px-1.5 text-[11.5px] border border-[#1348f3]/40 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
                          />
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                            NEW
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRow(r.id)}
                            className="p-0.5 text-slate-400 hover:text-red-600"
                            title="Remove this row"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium text-slate-800">{r.name}</span>
                      )}
                    </td>
                    {COLS.map((c, ci) => (
                      <td key={c.key} className="px-1 py-0.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          data-cell={`${r.id}:${c.key}`}
                          value={r[c.key]}
                          placeholder={
                            c.key === 'total' && r.total === '' && sum > 0
                              ? String(sum)
                              : ''
                          }
                          onChange={(e) => setCell(r.id, c.key, e.target.value)}
                          onFocus={(e) => e.currentTarget.select()}
                          onKeyDown={(e) => onCellKeyDown(e, r.id, ci)}
                          onPaste={(e) => onCellPaste(e, r.id, ci)}
                          className={cellInput}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-0.5 text-[10.5px] whitespace-nowrap">
                      {problem ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                          <AlertCircle size={12} />
                          {problem}
                        </span>
                      ) : filled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 size={12} />
                          OK · {r.total !== '' ? num(r.total) : sum}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100">
          <button
            type="button"
            onClick={addDoctorRow}
            className="h-8 px-3 inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Plus size={13} /> Add doctor
          </button>
          <span className="text-[11px] text-slate-500">
            {filledCount} row(s) filled · day total{' '}
            <strong className="text-slate-800 tabular-nums">{dayTotal}</strong>
          </span>
          <div className="ml-auto flex items-center gap-2">
            {saveError && (
              <span className="text-[11px] text-red-600 max-w-[340px] text-right">
                {saveError}
              </span>
            )}
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="h-8 px-3 text-[11px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !dirty || problems.size > 0 || !date}
              className="h-8 px-4 inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md bg-[#1348f3] text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={13} />
              {saving ? 'Saving…' : 'Save all'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
