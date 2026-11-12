import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SearchablePhysicianSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  /** Value that means "no filter" — shown as allLabel */
  allValue?: string;
  allLabel?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Compact searchable physician dropdown for filters.
 * Type to narrow the list; pick All or a name.
 */
export default function SearchablePhysicianSelect({
  value,
  onChange,
  options,
  allValue = 'All',
  allLabel = 'All Physicians',
  placeholder = 'Search physician…',
  className = '',
}: SearchablePhysicianSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((p) => p.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const display =
    value === allValue || !value ? allLabel : value;

  return (
    <div ref={wrapRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-1 text-[12px] border border-slate-200 rounded-md px-2 py-2 sm:py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 focus:border-[#1348f3] min-w-0 sm:min-w-[150px]"
      >
        <span className="truncate text-left">{display}</span>
        <ChevronDown size={13} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden min-w-[200px]">
          <div className="relative border-b border-slate-100">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-7 pr-2 py-1.5 text-[12px] outline-none"
              autoComplete="off"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(allValue);
                setOpen(false);
                setQuery('');
              }}
              className={`w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-slate-50 ${
                value === allValue ? 'bg-[#e8f8f0] text-[#0d9f6e] font-medium' : 'text-slate-700'
              }`}
            >
              {allLabel}
            </button>
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-[11px] text-slate-400">No matches</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    onChange(p);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-slate-50 truncate ${
                    value === p ? 'bg-[#e8f8f0] text-[#0d9f6e] font-medium' : 'text-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
