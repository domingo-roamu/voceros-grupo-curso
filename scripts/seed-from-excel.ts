/**
 * Script para importar datos desde TESORERIA_7D.xlsx a Supabase.
 *
 * Uso: npx tsx scripts/seed-from-excel.ts
 *
 * Requiere:
 *   - Archivo TESORERIA_7D.xlsx en la raíz del proyecto
 *   - Variables en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Hojas esperadas en el Excel:
 *   - "RESUMEN 2024", "RESUMEN 25", "RESUMEN 26" → Movimientos financieros
 *   - "CUOTA AÑO 2026" → Lista de alumnos y correos de apoderados
 *
 * El script es idempotente: usa upsert para evitar duplicados.
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EXCEL_PATH = path.resolve(process.cwd(), 'TESORERIA_7D.xlsx');

if (!fs.existsSync(EXCEL_PATH)) {
  console.error(`Error: No se encontró el archivo ${EXCEL_PATH}`);
  console.error('Coloca el archivo TESORERIA_7D.xlsx en la raíz del proyecto.');
  process.exit(1);
}

interface TransactionRow {
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string | null;
  amount: number;
  year: number;
}

interface StudentRow {
  full_name: string;
  parent1_name: string | null;
  parent1_email: string | null;
  parent2_name: string | null;
  parent2_email: string | null;
}

function parseExcelDate(value: unknown): string {
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  return new Date().toISOString().split('T')[0];
}

function cleanAmount(value: unknown): number {
  if (typeof value === 'number') return Math.abs(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    return Math.abs(parseFloat(cleaned) || 0);
  }
  return 0;
}

function normalizeCategory(raw: string): string {
  const normalized = raw.trim().toUpperCase();

  const knownCategories = [
    'CUOTAS', 'KERMESSE', 'OTRO INGRESO',
    'PASEO DE CURSO', 'DÍA DEL ALUMNO', 'COLACIÓN COMPARTIDA',
    'CLASS MERIT', 'CELEBRACIÓN 18', 'DÍA DEL AUXILIAR',
    'DÍA DEL PROFESOR', 'FIESTA GRADUACIÓN', 'OBSEQUIO', 'OTRO EGRESO',
  ];

  const found = knownCategories.find(
    (cat) => normalized.includes(cat) || cat.includes(normalized)
  );

  return found ?? normalized;
}

function parseResumenSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  year: number
): TransactionRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`  Hoja "${sheetName}" no encontrada, saltando.`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const transactions: TransactionRow[] = [];

  for (const row of rows) {
    // Try to find relevant columns by common names
    const dateVal = row['FECHA'] ?? row['Fecha'] ?? row['fecha'] ?? row['Date'];
    const categoryVal = row['CATEGORÍA'] ?? row['CATEGORIA'] ?? row['Categoría'] ?? row['categoria'] ??
      row['CONCEPTO'] ?? row['Concepto'] ?? row['DETALLE'] ?? row['Detalle'];
    const descVal = row['DESCRIPCIÓN'] ?? row['DESCRIPCION'] ?? row['Descripción'] ?? row['DETALLE'] ?? row['Detalle'];
    const incomeVal = row['INGRESO'] ?? row['Ingreso'] ?? row['INGRESOS'] ?? row['Ingresos'];
    const expenseVal = row['EGRESO'] ?? row['Egreso'] ?? row['EGRESOS'] ?? row['Egresos'];
    const amountVal = row['MONTO'] ?? row['Monto'] ?? row['monto'];
    const typeVal = row['TIPO'] ?? row['Tipo'] ?? row['tipo'];

    // Skip empty or header rows
    if (!dateVal && !categoryVal && !amountVal && !incomeVal && !expenseVal) continue;

    const category = typeof categoryVal === 'string' ? normalizeCategory(categoryVal) : 'OTRO EGRESO';
    const description = typeof descVal === 'string' ? descVal.trim() : null;

    // Determine type and amount
    let type: 'income' | 'expense' = 'expense';
    let amount = 0;

    if (incomeVal && cleanAmount(incomeVal) > 0) {
      type = 'income';
      amount = cleanAmount(incomeVal);
    } else if (expenseVal && cleanAmount(expenseVal) > 0) {
      type = 'expense';
      amount = cleanAmount(expenseVal);
    } else if (amountVal) {
      amount = cleanAmount(amountVal);
      if (typeof typeVal === 'string') {
        type = typeVal.toLowerCase().includes('ingreso') ? 'income' : 'expense';
      }
    }

    if (amount === 0) continue;

    transactions.push({
      date: parseExcelDate(dateVal),
      type,
      category,
      description: description !== category ? description : null,
      amount,
      year,
    });
  }

  return transactions;
}

function parseStudentsSheet(workbook: XLSX.WorkBook, sheetName: string): StudentRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`  Hoja "${sheetName}" no encontrada, saltando.`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const students: StudentRow[] = [];

  for (const row of rows) {
    const name = row['ALUMNO'] ?? row['Alumno'] ?? row['NOMBRE'] ?? row['Nombre'] ??
      row['NOMBRE ALUMNO'] ?? row['Nombre Alumno'];

    if (!name || typeof name !== 'string' || !name.trim()) continue;

    const parent1Name = row['APODERADO 1'] ?? row['Apoderado 1'] ?? row['APODERADO'] ?? row['Apoderado'];
    const parent1Email = row['CORREO 1'] ?? row['Correo 1'] ?? row['EMAIL 1'] ?? row['Email 1'] ??
      row['CORREO'] ?? row['Correo'] ?? row['EMAIL'] ?? row['Email'];
    const parent2Name = row['APODERADO 2'] ?? row['Apoderado 2'];
    const parent2Email = row['CORREO 2'] ?? row['Correo 2'] ?? row['EMAIL 2'] ?? row['Email 2'];

    students.push({
      full_name: name.trim(),
      parent1_name: typeof parent1Name === 'string' ? parent1Name.trim() : null,
      parent1_email: typeof parent1Email === 'string' ? parent1Email.trim().toLowerCase() : null,
      parent2_name: typeof parent2Name === 'string' ? parent2Name.trim() : null,
      parent2_email: typeof parent2Email === 'string' ? parent2Email.trim().toLowerCase() : null,
    });
  }

  return students;
}

async function main() {
  console.log('Leyendo archivo Excel...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  console.log(`  Hojas encontradas: ${workbook.SheetNames.join(', ')}`);

  // ================================================
  // 1. Import transactions
  // ================================================
  console.log('\n--- Importando movimientos ---');

  const sheetMappings: [string, number][] = [
    ['RESUMEN 2024', 2024],
    ['RESUMEN 25', 2025],
    ['RESUMEN 26', 2026],
  ];

  let totalTransactions = 0;

  for (const [sheetName, year] of sheetMappings) {
    const txs = parseResumenSheet(workbook, sheetName, year);
    if (txs.length === 0) {
      // Try alternative sheet names
      const altNames = workbook.SheetNames.filter((s) =>
        s.toLowerCase().includes(String(year).slice(-2)) || s.includes(String(year))
      );
      if (altNames.length > 0 && altNames[0] !== sheetName) {
        console.log(`  Intentando con hoja alternativa: "${altNames[0]}"`);
        const altTxs = parseResumenSheet(workbook, altNames[0], year);
        if (altTxs.length > 0) {
          console.log(`  ${altTxs.length} movimientos encontrados para ${year}`);
          const { error } = await supabase.from('transactions').upsert(altTxs, {
            onConflict: 'id',
            ignoreDuplicates: false,
          });
          if (error) {
            // Fallback: insert ignoring conflicts
            for (const tx of altTxs) {
              await supabase.from('transactions').insert(tx);
            }
          }
          totalTransactions += altTxs.length;
          continue;
        }
      }
      console.log(`  Sin movimientos para ${year}`);
      continue;
    }

    console.log(`  ${txs.length} movimientos encontrados para ${year}`);

    // Delete existing transactions for this year, then insert fresh (idempotent)
    await supabase.from('transactions').delete().eq('year', year);
    const batchSize = 100;
    for (let i = 0; i < txs.length; i += batchSize) {
      const batch = txs.slice(i, i + batchSize);
      const { error } = await supabase.from('transactions').insert(batch);
      if (error) {
        console.error(`  Error insertando batch ${year}:`, error.message);
      }
    }
    totalTransactions += txs.length;
  }

  console.log(`  Total movimientos importados: ${totalTransactions}`);

  // ================================================
  // 2. Import students
  // ================================================
  console.log('\n--- Importando alumnos ---');

  let students: StudentRow[] = [];
  const studentSheetNames = ['CUOTA AÑO 2026', 'CUOTAS 2026', 'ALUMNOS'];
  for (const name of studentSheetNames) {
    students = parseStudentsSheet(workbook, name);
    if (students.length > 0) {
      console.log(`  Hoja utilizada: "${name}"`);
      break;
    }
  }

  // Also try any sheet with "CUOTA" in the name
  if (students.length === 0) {
    const cuotaSheet = workbook.SheetNames.find((s) =>
      s.toUpperCase().includes('CUOTA')
    );
    if (cuotaSheet) {
      students = parseStudentsSheet(workbook, cuotaSheet);
      if (students.length > 0) {
        console.log(`  Hoja utilizada: "${cuotaSheet}"`);
      }
    }
  }

  if (students.length === 0) {
    console.warn('  No se encontraron alumnos en ninguna hoja.');
  } else {
    console.log(`  ${students.length} alumnos encontrados`);

    // Delete existing and re-insert (idempotent)
    await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    for (const student of students) {
      const { error } = await supabase.from('students').insert(student);
      if (error) {
        console.error(`  Error insertando alumno "${student.full_name}":`, error.message);
      }
    }
    console.log(`  ${students.length} alumnos importados`);
  }

  console.log('\n¡Seed completado exitosamente!');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
