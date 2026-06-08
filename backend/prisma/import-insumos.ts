/**
 * Importa insumos desde prisma/data/insumos-bar.xlsx
 * Hojas: MATERIA PRIMA, SUBPRODUCTO, PRODUCTOS BAR
 * Costo demo: $1 — actualizar después en admin
 */
import * as path from 'path';
import * as XLSX from 'xlsx';
import { IngredientKind, PrismaClient, UnitType } from '@prisma/client';

const EXCEL_PATH = path.join(__dirname, 'data', 'insumos-bar.xlsx');
const DEMO_COST = 1;
const DEMO_STOCK = 100;
const DEMO_MIN_STOCK = 10;

type RawRow = {
  name: string;
  kind: IngredientKind;
  unit: UnitType;
  tag?: string;
};

export type ImportInsumosResult = {
  total: number;
  created: number;
  updated: number;
  cocina: number;
  bebida: number;
};

function normalizeUnit(medida: string | undefined): UnitType {
  const m = (medida ?? '').trim().toUpperCase();
  switch (m) {
    case 'GR':
      return UnitType.GRAMO;
    case 'KG':
      return UnitType.KILO;
    case 'CC':
    case 'ML':
      return UnitType.ML;
    case 'L':
    case 'LT':
    case 'LITRO':
      return UnitType.LITRO;
    case 'UNI':
    case 'UNID':
    case 'UNIDAD':
      return UnitType.UNIDAD;
    default:
      return UnitType.UNIDAD;
  }
}

function cleanName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function sheetRows(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.warn(`⚠️  Hoja no encontrada: ${sheetName}`);
    return [];
  }
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
}

function parseMateriaPrima(rows: unknown[][]): RawRow[] {
  const out: RawRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cleanName(row?.[0]);
    const sub = cleanName(row?.[1]);
    const unit = normalizeUnit(cleanName(row?.[2]));
    if (!name) continue;
    out.push({
      name: sub && name.toUpperCase() === 'VARIOS' ? `${name} (${sub})` : name,
      kind: IngredientKind.COCINA,
      unit,
      tag: sub || undefined,
    });
  }
  return out;
}

function parseSubproducto(rows: unknown[][]): RawRow[] {
  const out: RawRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cleanName(row?.[0]);
    const unit = normalizeUnit(cleanName(row?.[1]));
    if (!name) continue;
    out.push({ name, kind: IngredientKind.COCINA, unit, tag: 'SUBPRODUCTO' });
  }
  return out;
}

function parseProductosBar(rows: unknown[][]): RawRow[] {
  const out: RawRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cleanName(row?.[0]);
    const unit = normalizeUnit(cleanName(row?.[1]) || 'CC');
    if (!name) continue;
    out.push({ name, kind: IngredientKind.BEBIDA, unit, tag: 'BAR' });
  }
  return out;
}

function assignUniqueNames(rows: RawRow[]): RawRow[] {
  const used = new Set<string>();
  return rows.map((row) => {
    let name = row.name;
    let candidate = name;
    let n = 2;
    while (used.has(candidate.toUpperCase())) {
      candidate = `${name} (${row.tag ?? n})`;
      n++;
    }
    used.add(candidate.toUpperCase());
    return { ...row, name: candidate };
  });
}

function loadExcelRows(): RawRow[] {
  const wb = XLSX.readFile(EXCEL_PATH);
  return assignUniqueNames([
    ...parseMateriaPrima(sheetRows(wb, 'MATERIA PRIMA')),
    ...parseSubproducto(sheetRows(wb, 'SUBPRODUCTO')),
    ...parseProductosBar(sheetRows(wb, 'PRODUCTOS BAR')),
  ]);
}

export async function importInsumosFromExcel(prisma: PrismaClient): Promise<ImportInsumosResult> {
  console.log('📥 Importando insumos desde Excel...');
  console.log(`   Archivo: ${EXCEL_PATH}`);

  const rows = loadExcelRows();
  console.log(`   ${rows.length} insumos a cargar (costo demo: $${DEMO_COST})`);

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await prisma.ingredient.findUnique({ where: { name: row.name } });
    await prisma.ingredient.upsert({
      where: { name: row.name },
      update: {
        kind: row.kind,
        unit: row.unit,
        cost: DEMO_COST,
        active: true,
      },
      create: {
        name: row.name,
        kind: row.kind,
        unit: row.unit,
        cost: DEMO_COST,
        currentStock: DEMO_STOCK,
        minStock: DEMO_MIN_STOCK,
      },
    });
    if (existing) updated++;
    else created++;
  }

  const cocina = rows.filter((r) => r.kind === IngredientKind.COCINA).length;
  const bebida = rows.filter((r) => r.kind === IngredientKind.BEBIDA).length;

  console.log('✅ Importación Excel completada');
  console.log(`   Nuevos: ${created} | Actualizados: ${updated}`);
  console.log(`   Cocina: ${cocina} | Bebida: ${bebida}`);

  return { total: rows.length, created, updated, cocina, bebida };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await importInsumosFromExcel(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}
