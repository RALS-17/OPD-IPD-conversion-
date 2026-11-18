/**
 * Accurate "Top diagnoses" counting.
 *
 * A diagnosis field often holds several conditions in one text, e.g.
 *   "GRAVIDA 0 ABNORMAL UTERINE BLEEDING ; RULE OUT ENDOMETRIAL ADENOMYOSIS ; CHRONIC HYPERTENSION"
 * so counting the whole text would make every record "unique". Instead we:
 *   1. split the text into separate diagnoses at  ;  ,  new lines  |  " / "  " + "
 *      (but never inside brackets, so "(2,0,0,2)" stays intact),
 *   2. clean each one (case, spaces, punctuation, list numbers, obstetric "G3P1 (2001)" prefixes,
 *      trailing "28 weeks AOG"),
 *   3. treat "RULE OUT x", "R/O x", "TO CONSIDER x", "POSSIBLE x" … as the same condition x
 *      (flagged as a differential so it can be excluded),
 *   4. merge well-known abbreviations (UTI → URINARY TRACT INFECTION, …),
 *   5. count every diagnosis ONCE per patient record.
 */

export type DiagnosisMode = 'all' | 'primary';

export interface DiagnosisCount {
  name: string;
  /** Number of patient records that mention this diagnosis */
  count: number;
  /** Share of records (that have a diagnosis) mentioning it, 0–100 with one decimal */
  percent: number;
}

export interface DiagnosisTerm {
  key: string;
  label: string;
  /** "rule out / to consider / possible …" – not a confirmed diagnosis */
  differential: boolean;
}

/** Whole-term abbreviations only (a term must BE the abbreviation). Edit freely. */
const ABBREVIATIONS: Record<string, string> = {
  UTI: 'URINARY TRACT INFECTION',
  URTI: 'UPPER RESPIRATORY TRACT INFECTION',
  BPPV: 'BENIGN PAROXYSMAL POSITIONAL VERTIGO',
  SVT: 'SUPRAVENTRICULAR TACHYCARDIA',
  AKI: 'ACUTE KIDNEY INJURY',
  CKD: 'CHRONIC KIDNEY DISEASE',
  CHF: 'CONGESTIVE HEART FAILURE',
  COPD: 'CHRONIC OBSTRUCTIVE PULMONARY DISEASE',
  HTN: 'HYPERTENSION',
  CAP: 'COMMUNITY ACQUIRED PNEUMONIA',
  PTB: 'PULMONARY TUBERCULOSIS',
  ACS: 'ACUTE CORONARY SYNDROME',
  CVA: 'CEREBROVASCULAR ACCIDENT',
  TIA: 'TRANSIENT ISCHEMIC ATTACK',
  GERD: 'GASTROESOPHAGEAL REFLUX DISEASE',
  PCOS: 'POLYCYSTIC OVARIAN SYNDROME',
  AUB: 'ABNORMAL UTERINE BLEEDING',
};

const DIFFERENTIAL_PREFIX =
  /^(?:TO\s+RULE\s+OUT|RULE\s+OUT|TO\s+CONSIDER|CONSIDER|R\s*\/\s*O|R\.\s*O\.?|T\s*\/\s*C|POSSIBLY|POSSIBLE|PROBABLY|PROBABLE|SUSPECTED|SUSPECT|\?)\s*[:\-]?\s*/;

/** Leading "GRAVIDA 3 PARA 1 (2001)" / "G2P1 (1001)" – patient descriptor, not a diagnosis */
const OB_PREFIX = /^G(?:RAVIDA)?\s*\d+\s*(?:P(?:ARA)?\s*\d+)?\s*(?:\([^)]*\))?\s*/;

/** Gestational age noise anywhere in the text: "28 2/7 WEEKS AOG", "32 WKS", stray "AOG" */
const GESTATION_NOISE =
  /\s*\b\d+(?:\s+\d+\s*\/\s*\d+)?\s*(?:WEEKS?|WKS?)\b(?:\s+(?:AOG|AGE\s+OF\s+GESTATION))?|\s*\bAOG\b/g;

/** Split free text into separate diagnosis strings (delimiters outside brackets only). */
export function splitDiagnosisText(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  const s = text.replace(/\r/g, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    const spaced = (token: string) =>
      s.slice(i, i + token.length) === token && depth === 0;

    if (depth === 0 && (ch === ';' || ch === ',' || ch === '\n' || ch === '|')) {
      out.push(cur);
      cur = '';
    } else if (spaced(' / ') || spaced(' + ')) {
      out.push(cur);
      cur = '';
      i += 2; // skip the rest of the 3-char token
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Clean one piece into a comparable diagnosis term, or null if it is just noise. */
export function normalizeDiagnosisTerm(raw: string): DiagnosisTerm | null {
  let t = raw.replace(/\s+/g, ' ').trim().toUpperCase();
  t = t.replace(/^["'“”]+|["'“”]+$/g, '');
  t = t.replace(/^\d+\s*[.)]\s+/, ''); // "1. HYPERTENSION"
  t = t.replace(/^(?:AND|&|WITH|\+)\s+/, '');

  let differential = false;
  for (let i = 0; i < 3; i++) {
    const m = DIFFERENTIAL_PREFIX.exec(t);
    if (!m || !m[0]) break;
    differential = true;
    t = t.slice(m[0].length);
  }

  t = t.replace(OB_PREFIX, '');
  t = t.replace(GESTATION_NOISE, '').replace(/\s+/g, ' ');
  t = t.replace(/[\s.\-:]+$/g, '').replace(/^[\s.\-:]+/g, '');

  if ((t.match(/[A-Z]/g) || []).length < 3) return null; // numbers / fragments

  if (ABBREVIATIONS[t]) t = ABBREVIATIONS[t];

  const key = t.replace(/[^A-Z0-9]+/g, ' ').trim();
  if (!key) return null;
  return { key, label: t, differential };
}

/** All distinct diagnosis terms of one record, in the order written (duplicates removed). */
export function termsOf(diagnosisText: string): DiagnosisTerm[] {
  const seen = new Set<string>();
  const terms: DiagnosisTerm[] = [];
  splitDiagnosisText(diagnosisText || '').forEach((piece) => {
    const term = normalizeDiagnosisTerm(piece);
    if (!term || seen.has(term.key)) return;
    seen.add(term.key);
    terms.push(term);
  });
  return terms;
}

export function rankDiagnoses(
  admissions: { diagnosis: string }[],
  opts: { limit?: number; mode?: DiagnosisMode; includeDifferentials?: boolean } = {}
): { items: DiagnosisCount[]; patients: number } {
  const { limit = 10, mode = 'all', includeDifferentials = true } = opts;
  const counts = new Map<string, { label: string; count: number }>();
  let patients = 0;

  admissions.forEach((a) => {
    let terms = termsOf(a.diagnosis);
    if (!includeDifferentials) terms = terms.filter((t) => !t.differential);
    if (mode === 'primary') terms = terms.slice(0, 1);
    if (terms.length === 0) return;
    patients += 1;
    terms.forEach((t) => {
      const cur = counts.get(t.key);
      if (cur) cur.count += 1;
      else counts.set(t.key, { label: t.label, count: 1 });
    });
  });

  const items = Array.from(counts.values())
    .map((v) => ({
      name: v.label,
      count: v.count,
      percent: patients > 0 ? Math.round((v.count / patients) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);

  return { items, patients };
}
