/**
 * Script para cargar datos históricos desde el Excel a Supabase.
 *
 * Uso: npx tsx scripts/load-data.ts
 *
 * Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const EXCEL_PATH = path.resolve(process.cwd(), 'temp-docs', 'TESORERIA 7D.xlsx');

// ============================================================
// Helpers
// ============================================================

function cleanAmount(val: unknown): number {
  if (typeof val === 'number') return Math.abs(Math.round(val));
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : Math.abs(Math.round(n));
  }
  return 0;
}

function normalizeCategory(raw: string, type: 'income' | 'expense'): string {
  const upper = raw.trim().toUpperCase();

  // Income mappings
  if (upper.includes('CUOTA') || upper.includes('APORTE')) return 'CUOTAS';
  if (upper.includes('KERMESSE') || upper.includes('KERMÉS')) return 'KERMESSE';
  if (upper.includes('CARNE') || upper.includes('CARNÉT')) return 'KERMESSE';

  // Expense mappings
  if (upper.includes('PASEO')) return 'PASEO DE CURSO';
  if (upper.includes('ALUMNO')) return 'DÍA DEL ALUMNO';
  if (upper.includes('COLACI') || upper.includes('COLACIÓN')) return 'COLACIÓN COMPARTIDA';
  if (upper.includes('CLASS MERIT') || upper.includes('MERIT')) return 'CLASS MERIT';
  if (upper.includes('18') || upper.includes('FIESTAS PATRIAS')) return 'CELEBRACIÓN 18';
  if (upper.includes('AUXILIAR')) return 'DÍA DEL AUXILIAR';
  if (upper.includes('PROFESOR')) return 'DÍA DEL PROFESOR';
  if (upper.includes('GRADUACI') || upper.includes('LICENCIATURA')) return 'FIESTA GRADUACIÓN';
  if (upper.includes('OBSEQUIO') || upper.includes('REGALO') || upper.includes('FLORES')) return 'OBSEQUIO';

  return type === 'income' ? 'OTRO INGRESO' : 'OTRO EGRESO';
}

// ============================================================
// Parse RESUMEN 2024
// ============================================================
function parseResumen2024(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['RESUMEN 2024'];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    defval: null,
  });

  const transactions: {
    date: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    year: number;
  }[] = [];

  let section: 'unknown' | 'income' | 'expense' = 'unknown';

  for (const row of rows) {
    const colA = String(row['A'] ?? '').trim();
    const colB = cleanAmount(row['B']);

    // Detect section
    if (colA.toUpperCase().includes('INGRESO')) {
      section = 'income';
      continue;
    }
    if (colA.toUpperCase().includes('EGRESO')) {
      section = 'expense';
      continue;
    }

    // Skip headers, totals, empty
    if (!colA || colB === 0) continue;
    if (colA.toUpperCase().includes('TOTAL')) continue;
    if (colA.toUpperCase().includes('SALDO')) continue;
    if (colA.toUpperCase().includes('DETALLE')) continue;
    if (section === 'unknown') continue;

    const category = normalizeCategory(colA, section);

    transactions.push({
      date: section === 'income' ? '2024-06-15' : '2024-09-15', // approximate dates
      type: section,
      category,
      description: colA,
      amount: colB,
      year: 2024,
    });
  }

  return transactions;
}

// ============================================================
// Parse RESUMEN 25
// ============================================================
function parseResumen25(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['RESUMEN 25'];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: ['A', 'B'],
    defval: null,
  });

  const transactions: {
    date: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    year: number;
  }[] = [];

  for (const row of rows) {
    const colA = String(row['A'] ?? '').trim();
    const colB = cleanAmount(row['B']);

    if (!colA || colB === 0) continue;
    if (colA.toUpperCase().includes('TOTAL')) continue;
    if (colA.toUpperCase().includes('SALDO')) continue;
    if (colA.toUpperCase().includes('EGRESO')) continue;
    if (colA.toUpperCase().includes('INGRESO')) continue;
    if (colA.toUpperCase().includes('DETALLE')) continue;

    // Determine if income or expense from context
    // RESUMEN 25 is primarily expenses based on the analysis
    const isIncome = colA.toUpperCase().includes('CUOTA') || colA.toUpperCase().includes('APORTE');
    const type = isIncome ? 'income' as const : 'expense' as const;
    const category = normalizeCategory(colA, type);

    transactions.push({
      date: '2025-06-15',
      type,
      category,
      description: colA,
      amount: colB,
      year: 2025,
    });
  }

  return transactions;
}

// ============================================================
// Parse RESUMEN 26
// ============================================================
function parseResumen26(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['RESUMEN 26'];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: ['A', 'B', 'C', 'D'],
    defval: null,
  });

  const transactions: {
    date: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    year: number;
  }[] = [];

  for (const row of rows) {
    const colA = String(row['A'] ?? '').trim();
    const colB = cleanAmount(row['B']);
    const colC = cleanAmount(row['C']);
    const amount = colB || colC;

    if (!colA || amount === 0) continue;
    if (colA.toUpperCase().includes('TOTAL')) continue;
    if (colA.toUpperCase().includes('SALDO')) continue;
    if (colA.toUpperCase().includes('EGRESO')) continue;
    if (colA.toUpperCase().includes('INGRESO')) continue;
    if (colA.toUpperCase().includes('DETALLE')) continue;

    const isIncome = colA.toUpperCase().includes('CUOTA') || colA.toUpperCase().includes('APORTE');
    const type = isIncome ? 'income' as const : 'expense' as const;
    const category = normalizeCategory(colA, type);

    transactions.push({
      date: '2026-03-15',
      type,
      category,
      description: colA,
      amount,
      year: 2026,
    });
  }

  return transactions;
}

// ============================================================
// Parse Students from CUOTA AÑO 2026
// ============================================================
function parseStudents(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['CUOTA AÑO 2026'];
  if (!sheet) {
    // Try alternative names
    const alt = workbook.SheetNames.find((s) => s.toUpperCase().includes('CUOTA'));
    if (!alt) return [];
    return parseStudentsFromSheet(workbook.Sheets[alt]);
  }
  return parseStudentsFromSheet(sheet);
}

function parseStudentsFromSheet(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
    defval: null,
  });

  const students: {
    full_name: string;
    parent1_name: string | null;
    parent1_email: string | null;
    parent2_name: string | null;
    parent2_email: string | null;
  }[] = [];

  for (const row of rows) {
    // Student name is in column J (duplicate of A, but the contact section)
    const name = String(row['J'] ?? row['A'] ?? '').trim();
    if (!name) continue;

    // Skip header rows and totals
    const upper = name.toUpperCase();
    if (upper.includes('ALUMNO') || upper.includes('TOTAL') || upper.includes('CUOTA')) continue;
    if (name.length < 3) continue;

    const parent1Name = row['K'] ? String(row['K']).trim() : null;
    const parent1Email = row['L'] ? String(row['L']).trim().toLowerCase() : null;
    const parent2Name = row['M'] ? String(row['M']).trim() : null;
    const parent2Email = row['N'] ? String(row['N']).trim().toLowerCase() : null;

    // Validate email format loosely
    const validEmail = (e: string | null) =>
      e && e.includes('@') && e.includes('.') ? e : null;

    students.push({
      full_name: name,
      parent1_name: parent1Name,
      parent1_email: validEmail(parent1Email),
      parent2_name: parent2Name,
      parent2_email: validEmail(parent2Email),
    });
  }

  return students;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('=== Cargando datos a Supabase ===\n');
  console.log('Leyendo Excel...');

  const workbook = XLSX.readFile(EXCEL_PATH);
  console.log(`Hojas: ${workbook.SheetNames.join(', ')}\n`);

  // ---- 1. Students ----
  console.log('--- Importando alumnos ---');
  const students = parseStudents(workbook);
  console.log(`  ${students.length} alumnos encontrados`);

  if (students.length > 0) {
    // Clear existing students and their quota payments
    await supabase.from('quota_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    for (const student of students) {
      const { data, error } = await supabase
        .from('students')
        .insert(student)
        .select('id')
        .single();

      if (error) {
        console.error(`  Error: ${student.full_name} — ${error.message}`);
        continue;
      }

      // Create 10 empty quota_payments for 2026
      if (data) {
        const quotas = Array.from({ length: 10 }, (_, i) => ({
          student_id: data.id,
          year: 2026,
          quota_number: i + 1,
          amount: 10000, // $10.000 default
          is_paid: false,
        }));

        const { error: quotaError } = await supabase.from('quota_payments').insert(quotas);
        if (quotaError) {
          console.error(`  Error cuotas ${student.full_name}: ${quotaError.message}`);
        }
      }
    }
    console.log(`  ${students.length} alumnos + cuotas insertados\n`);
  }

  // ---- 2. Transactions ----
  console.log('--- Importando movimientos ---');

  const tx2024 = parseResumen2024(workbook);
  const tx2025 = parseResumen25(workbook);
  const tx2026 = parseResumen26(workbook);

  console.log(`  2024: ${tx2024.length} movimientos`);
  console.log(`  2025: ${tx2025.length} movimientos`);
  console.log(`  2026: ${tx2026.length} movimientos`);

  const allTx = [...tx2024, ...tx2025, ...tx2026];

  if (allTx.length > 0) {
    // Clear existing transactions
    for (const year of [2024, 2025, 2026]) {
      await supabase.from('transactions').delete().eq('year', year);
    }

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < allTx.length; i += batchSize) {
      const batch = allTx.slice(i, i + batchSize);
      const { error } = await supabase.from('transactions').insert(batch);
      if (error) {
        console.error(`  Error batch ${i}: ${error.message}`);
        // Try one by one
        for (const tx of batch) {
          const { error: singleErr } = await supabase.from('transactions').insert(tx);
          if (singleErr) {
            console.error(`    Skip: ${tx.description} — ${singleErr.message}`);
          }
        }
      }
    }
    console.log(`  ${allTx.length} movimientos insertados\n`);
  }

  // ---- 3. Verify ----
  console.log('--- Verificación ---');
  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
  const { count: txCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });
  const { count: quotaCount } = await supabase
    .from('quota_payments')
    .select('*', { count: 'exact', head: true });

  console.log(`  Alumnos: ${studentCount}`);
  console.log(`  Movimientos: ${txCount}`);
  console.log(`  Cuotas: ${quotaCount}`);

  console.log('\n¡Carga completada!');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
