/** Print-friendly dashboard snapshot via hidden iframe (no pop-up needed). */

export interface PrintDashboardPayload {
  hospitalName: string;
  branch: string;
  periodLabel: string;
  compareLabel?: string | null;
  generatedAt: string;
  kpis: {
    totalOpd: number;
    advised: number;
    actual: number;
    conversion: number;
  };
  prevKpis?: {
    totalOpd: number;
    advised: number;
    actual: number;
    conversion: number;
  } | null;
  topPhysicians: {
    physician: string;
    department?: string;
    totalOpdConsults: number;
    actualAdmissionsFromOpd: number;
    conversionRate: number;
  }[];
  topDiagnoses: { name: string; count: number }[];
  filteredCount: number;
}

function deltaHtml(cur: number, prev: number | undefined, suffix = ''): string {
  if (prev === undefined || prev === null) return '';
  const d = Math.round((cur - prev) * 10) / 10;
  const sign = d > 0 ? '+' : '';
  const color = d > 0 ? '#059669' : d < 0 ? '#dc2626' : '#64748b';
  return `<span style="color:${color};font-size:11px;font-weight:600;margin-left:6px">${sign}${d}${suffix}</span>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(p: PrintDashboardPayload): string {
  const rows = p.topPhysicians
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.physician)}</td>
      <td>${escapeHtml(r.department || '—')}</td>
      <td style="text-align:right">${r.totalOpdConsults}</td>
      <td style="text-align:right">${r.actualAdmissionsFromOpd}</td>
      <td style="text-align:right">${r.conversionRate}%</td>
    </tr>`
    )
    .join('');

  const dx = p.topDiagnoses
    .map(
      (d, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(d.name)}</td><td style="text-align:right">${d.count}</td></tr>`
    )
    .join('');

  const prev = p.prevKpis;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dashboard Snapshot · ${escapeHtml(p.hospitalName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #0f172a; margin: 24px; font-size: 13px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 13px; margin: 18px 0 8px; color: #334155; }
    .meta { color: #64748b; font-size: 11px; margin-bottom: 16px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 8px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
    .card .label { color: #64748b; font-size: 11px; font-weight: 500; }
    .card .value { font-size: 22px; font-weight: 700; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #f1f5f9; padding: 6px 8px; text-align: left; }
    th { background: #f8fafc; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.02em; }
    @media print {
      body { margin: 12px; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(p.hospitalName)} · OPD → IPD Dashboard</h1>
  <div class="meta">
    ${escapeHtml(p.branch)} · Period: <strong>${escapeHtml(p.periodLabel)}</strong>
    ${p.compareLabel ? ` · ${escapeHtml(p.compareLabel)}` : ''}
    · ${p.filteredCount} records · Generated ${escapeHtml(p.generatedAt)}
  </div>

  <div class="kpis">
    <div class="card">
      <div class="label">Total OPD Consults</div>
      <div class="value">${p.kpis.totalOpd}${deltaHtml(p.kpis.totalOpd, prev?.totalOpd)}</div>
    </div>
    <div class="card">
      <div class="label">Advised for Admission</div>
      <div class="value">${p.kpis.advised}${deltaHtml(p.kpis.advised, prev?.advised)}</div>
    </div>
    <div class="card">
      <div class="label">Actual Admissions</div>
      <div class="value">${p.kpis.actual}${deltaHtml(p.kpis.actual, prev?.actual)}</div>
    </div>
    <div class="card">
      <div class="label">Overall Conversion Rate</div>
      <div class="value">${p.kpis.conversion}%${deltaHtml(p.kpis.conversion, prev?.conversion, ' pts')}</div>
    </div>
  </div>

  <h2>Top Physicians by Conversion Rate</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Physician</th><th>Department</th>
        <th style="text-align:right">OPD</th>
        <th style="text-align:right">Admissions</th>
        <th style="text-align:right">Rate</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6">No data</td></tr>'}
    </tbody>
  </table>

  <h2>Top Diagnoses</h2>
  <table>
    <thead><tr><th>#</th><th>Diagnosis</th><th style="text-align:right">Count</th></tr></thead>
    <tbody>${dx || '<tr><td colspan="3">No data</td></tr>'}</tbody>
  </table>

  <p class="meta" style="margin-top:24px">Confidential · For internal meeting use · Use Print → Save as PDF.</p>
</body>
</html>`;
}

export function printDashboardSnapshot(p: PrintDashboardPayload): void {
  const html = buildHtml(p);

  // Prefer hidden iframe — not blocked as a pop-up
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print dashboard');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!win || !doc) {
    document.body.removeChild(iframe);
    // Last resort: same-tab blob (still no pop-up permission needed for download-style)
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return;
  }

  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      /* already removed */
    }
  };

  doc.open();
  doc.write(html);
  doc.close();

  // Wait a tick so layout is ready, then print
  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      // Remove iframe after print dialog closes (or after a delay if afterprint unsupported)
      const remove = () => cleanup();
      win.addEventListener('afterprint', remove, { once: true });
      setTimeout(remove, 60_000);
    }
  };

  if (doc.readyState === 'complete') {
    setTimeout(triggerPrint, 50);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 50);
  }
}
