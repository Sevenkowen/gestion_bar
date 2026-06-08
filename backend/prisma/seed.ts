import {
  PrismaClient,
  RoleName,
  PrintSector,
  IngredientKind,
  UnitType,
  TableStatus,
  MenuItemType,
  Ingredient,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { promisify } from 'util';
import { importInsumosFromExcel } from './import-insumos';

const bcryptHash = promisify(bcrypt.hash);
const prisma = new PrismaClient();

type RecipeLine = { ingredientId: number; quantity: number };

async function upsertIngredient(
  name: string,
  opts: {
    kind?: IngredientKind;
    unit?: UnitType;
    currentStock?: number;
    minStock?: number;
    cost?: number;
  } = {},
): Promise<Ingredient> {
  return prisma.ingredient.upsert({
    where: { name },
    update: {
      kind: opts.kind,
      unit: opts.unit,
      currentStock: opts.currentStock,
      minStock: opts.minStock,
      cost: opts.cost,
    },
    create: {
      name,
      kind: opts.kind ?? IngredientKind.COCINA,
      unit: opts.unit ?? UnitType.UNIDAD,
      currentStock: opts.currentStock ?? 100,
      minStock: opts.minStock ?? 20,
      cost: opts.cost ?? 100,
    },
  });
}

async function upsertProduct(
  branchId: number,
  name: string,
  categoryId: number,
  price: number,
  printSector: PrintSector,
  recipe: RecipeLine[],
  description?: string,
) {
  const existing = await prisma.product.findFirst({
    where: { branchId, name, deletedAt: null },
  });

  if (existing) {
    await prisma.productIngredient.deleteMany({ where: { productId: existing.id } });
    await prisma.product.update({
      where: { id: existing.id },
      data: { price, categoryId, printSector, description, active: true },
    });
    if (recipe.length) {
      await prisma.productIngredient.createMany({
        data: recipe.map((r) => ({ productId: existing.id, ...r })),
      });
    }
    return existing;
  }

  return prisma.product.create({
    data: {
      name,
      description,
      price,
      categoryId,
      printSector,
      branchId,
      recipe: { create: recipe },
    },
  });
}

async function main() {
  console.log('🌱 Seeding SistemaBar — carta del cliente...');

  const branch = await prisma.branch.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Samburgeronimo', address: 'Local demo' },
  });

  const passwordHash = await bcryptHash('admin123', 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      name: 'Administrador',
      role: RoleName.ADMIN,
      branchId: branch.id,
    },
  });

  const mozoHash = await bcryptHash('mozo123', 12);
  await prisma.user.upsert({
    where: { username: 'mozo1' },
    update: {},
    create: {
      username: 'mozo1',
      passwordHash: mozoHash,
      name: 'Juan Mozo',
      role: RoleName.MOZO,
      branchId: branch.id,
    },
  });

  const cajaHash = await bcryptHash('caja123', 12);
  await prisma.user.upsert({
    where: { username: 'caja1' },
    update: {},
    create: {
      username: 'caja1',
      passwordHash: cajaHash,
      name: 'María Caja',
      role: RoleName.CAJA,
      branchId: branch.id,
    },
  });

  for (let i = 1; i <= 12; i++) {
    await prisma.table.upsert({
      where: { branchId_number: { branchId: branch.id, number: i } },
      update: {},
      create: {
        number: i,
        name: `Mesa ${i}`,
        capacity: i <= 4 ? 2 : 4,
        status: TableStatus.LIBRE,
        branchId: branch.id,
      },
    });
  }

  await prisma.printer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Cocina',
      sector: PrintSector.COCINA,
      address: '192.168.1.100:9100',
      branchId: branch.id,
    },
  });

  await prisma.printer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Barra',
      sector: PrintSector.BARRA,
      address: '192.168.1.101:9100',
      branchId: branch.id,
    },
  });

  // ── Categorías ──────────────────────────────────────────────
  const catBurgers = await prisma.category.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Hamburguesas' } },
    update: { sortOrder: 1 },
    create: { name: 'Hamburguesas', sortOrder: 1, branchId: branch.id },
  });

  const catPizzas = await prisma.category.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Pizzas' } },
    update: { sortOrder: 2 },
    create: { name: 'Pizzas', sortOrder: 2, branchId: branch.id },
  });

  const catPapas = await prisma.category.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Papas' } },
    update: { sortOrder: 3 },
    create: { name: 'Papas', sortOrder: 3, branchId: branch.id },
  });

  const catBebidas = await prisma.category.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Bebidas' } },
    update: { sortOrder: 4 },
    create: { name: 'Bebidas', sortOrder: 4, branchId: branch.id },
  });

  // Excel del cliente (100 insumos) — antes de recetas demo
  await importInsumosFromExcel(prisma);

  // ── Insumos cocina (recetas) ────────────────────────────────
  const pan = await upsertIngredient('Pan hamburguesa', {
    currentStock: 200,
    minStock: 40,
    cost: 120,
  });
  const medallon = await upsertIngredient('Medallón carne', {
    currentStock: 300,
    minStock: 60,
    cost: 450,
  });
  const medallonVeg = await upsertIngredient('Medallón vegetal', {
    currentStock: 80,
    minStock: 20,
    cost: 400,
  });
  const cheddar = await upsertIngredient('Queso cheddar', {
    currentStock: 500,
    minStock: 80,
    cost: 60,
  });
  const mozzarella = await upsertIngredient('Queso mozzarella', {
    currentStock: 400,
    minStock: 60,
    cost: 55,
  });
  const provolone = await upsertIngredient('Queso provolone', {
    currentStock: 150,
    minStock: 30,
    cost: 70,
  });
  const panceta = await upsertIngredient('Panceta', {
    currentStock: 120,
    minStock: 25,
    cost: 90,
  });
  const rucula = await upsertIngredient('Rúcula', {
    unit: UnitType.GRAMO,
    currentStock: 5000,
    minStock: 500,
    cost: 0.8,
  });
  const champignons = await upsertIngredient('Champiñones', {
    unit: UnitType.GRAMO,
    currentStock: 8000,
    minStock: 1000,
    cost: 0.6,
  });
  const cebolla = await upsertIngredient('Cebolla caramelizada', {
    unit: UnitType.GRAMO,
    currentStock: 6000,
    minStock: 800,
    cost: 0.4,
  });
  const huevo = await upsertIngredient('Huevo', { currentStock: 120, minStock: 24, cost: 80 });
  const bondiola = await upsertIngredient('Bondiola', {
    unit: UnitType.GRAMO,
    currentStock: 10000,
    minStock: 1500,
    cost: 0.9,
  });
  const surimi = await upsertIngredient('Surimi cangrejo', {
    unit: UnitType.GRAMO,
    currentStock: 5000,
    minStock: 800,
    cost: 0.7,
  });
  const papas = await upsertIngredient('Papas', {
    unit: UnitType.GRAMO,
    currentStock: 50000,
    minStock: 8000,
    cost: 0.35,
  });
  const masaPizza = await upsertIngredient('Masa pizza', {
    currentStock: 100,
    minStock: 20,
    cost: 350,
  });
  const salsaTomate = await upsertIngredient('Salsa tomate', {
    unit: UnitType.GRAMO,
    currentStock: 15000,
    minStock: 2000,
    cost: 0.25,
  });
  const albahaca = await upsertIngredient('Albahaca', {
    unit: UnitType.GRAMO,
    currentStock: 2000,
    minStock: 300,
    cost: 1.2,
  });
  const aceitunas = await upsertIngredient('Aceitunas', {
    unit: UnitType.GRAMO,
    currentStock: 4000,
    minStock: 500,
    cost: 0.9,
  });
  const bacon = await upsertIngredient('Bacon ahumado', {
    unit: UnitType.GRAMO,
    currentStock: 8000,
    minStock: 1000,
    cost: 1.1,
  });
  const salsaBBQ = await upsertIngredient('Salsa BBQ', {
    unit: UnitType.GRAMO,
    currentStock: 6000,
    minStock: 800,
    cost: 0.5,
  });

  const ins = {
    pan,
    medallon,
    medallonVeg,
    cheddar,
    mozzarella,
    provolone,
    panceta,
    rucula,
    champignons,
    cebolla,
    huevo,
    bondiola,
    surimi,
    papas,
    masaPizza,
    salsaTomate,
    albahaca,
    aceitunas,
    bacon,
    salsaBBQ,
  };

  const burgerBase = (): RecipeLine[] => [
    { ingredientId: ins.pan.id, quantity: 1 },
    { ingredientId: ins.medallon.id, quantity: 1 },
  ];
  const burgerDoble = (): RecipeLine[] => [
    { ingredientId: ins.pan.id, quantity: 1 },
    { ingredientId: ins.medallon.id, quantity: 2 },
  ];
  const pizzaBase = (extra: RecipeLine[] = []): RecipeLine[] => [
    { ingredientId: ins.masaPizza.id, quantity: 1 },
    { ingredientId: ins.salsaTomate.id, quantity: 80 },
    { ingredientId: ins.mozzarella.id, quantity: 120 },
    ...extra,
  ];

  // ── Productos: Hamburguesas ─────────────────────────────────
  const burgers: { name: string; price: number; recipe: RecipeLine[] }[] = [
    { name: 'Kid Simple', price: 3500, recipe: burgerBase() },
    { name: 'Simple', price: 4200, recipe: burgerBase() },
    { name: 'Vegeta', price: 4800, recipe: [{ ingredientId: ins.pan.id, quantity: 1 }, { ingredientId: ins.medallonVeg.id, quantity: 1 }] },
    { name: 'Sosojita', price: 4500, recipe: [...burgerBase(), { ingredientId: ins.salsaBBQ.id, quantity: 20 }] },
    { name: 'Clasica', price: 4500, recipe: burgerBase() },
    { name: 'Camorra', price: 5200, recipe: [...burgerBase(), { ingredientId: ins.cheddar.id, quantity: 2 }, { ingredientId: ins.bacon.id, quantity: 30 }] },
    { name: 'De rucula', price: 5500, recipe: [...burgerBase(), { ingredientId: ins.rucula.id, quantity: 15 }, { ingredientId: ins.provolone.id, quantity: 1 }] },
    { name: 'Samburgeronimo', price: 6500, recipe: [...burgerDoble(), { ingredientId: ins.cheddar.id, quantity: 3 }, { ingredientId: ins.bacon.id, quantity: 40 }] },
    { name: 'Champiburger', price: 5500, recipe: [...burgerBase(), { ingredientId: ins.champignons.id, quantity: 40 }, { ingredientId: ins.cheddar.id, quantity: 2 }] },
    { name: 'Smoken', price: 5800, recipe: [...burgerBase(), { ingredientId: ins.bacon.id, quantity: 35 }, { ingredientId: ins.cheddar.id, quantity: 2 }] },
    { name: 'Rocker', price: 6000, recipe: [...burgerBase(), { ingredientId: ins.huevo.id, quantity: 1 }, { ingredientId: ins.bacon.id, quantity: 25 }] },
    { name: 'Cheese', price: 4800, recipe: [...burgerBase(), { ingredientId: ins.cheddar.id, quantity: 3 }] },
    { name: 'Deja Vu', price: 5200, recipe: [...burgerBase(), { ingredientId: ins.cheddar.id, quantity: 2 }, { ingredientId: ins.cebolla.id, quantity: 25 }] },
    { name: 'Moderna', price: 5500, recipe: [...burgerBase(), { ingredientId: ins.rucula.id, quantity: 10 }, { ingredientId: ins.huevo.id, quantity: 1 }] },
    { name: 'Doble X', price: 6200, recipe: [...burgerDoble(), { ingredientId: ins.cheddar.id, quantity: 2 }] },
    { name: 'Doble SB', price: 6800, recipe: [...burgerDoble(), { ingredientId: ins.cheddar.id, quantity: 4 }, { ingredientId: ins.bacon.id, quantity: 30 }] },
    { name: 'Cheesta', price: 5000, recipe: [...burgerBase(), { ingredientId: ins.cheddar.id, quantity: 4 }] },
    { name: 'DobleClass', price: 5800, recipe: burgerDoble() },
    { name: 'Bandida', price: 6200, recipe: [...burgerBase(), { ingredientId: ins.panceta.id, quantity: 2 }, { ingredientId: ins.cheddar.id, quantity: 2 }] },
    { name: 'Provocheese', price: 5800, recipe: [...burgerBase(), { ingredientId: ins.provolone.id, quantity: 2 }, { ingredientId: ins.cheddar.id, quantity: 1 }] },
    { name: 'Championa', price: 6000, recipe: [...burgerDoble(), { ingredientId: ins.cheddar.id, quantity: 3 }] },
    { name: 'Cangreburger', price: 6500, recipe: [...burgerBase(), { ingredientId: ins.surimi.id, quantity: 50 }, { ingredientId: ins.cheddar.id, quantity: 2 }] },
    { name: 'Pegrilosa', price: 5800, recipe: [...burgerBase(), { ingredientId: ins.bacon.id, quantity: 30 }, { ingredientId: ins.salsaBBQ.id, quantity: 25 }] },
    { name: 'Bondiolita', price: 5500, recipe: [...burgerBase(), { ingredientId: ins.bondiola.id, quantity: 60 }, { ingredientId: ins.cebolla.id, quantity: 20 }] },
  ];

  const burgerProducts: Awaited<ReturnType<typeof upsertProduct>>[] = [];
  for (const b of burgers) {
    burgerProducts.push(
      await upsertProduct(branch.id, b.name, catBurgers.id, b.price, PrintSector.COCINA, b.recipe),
    );
  }

  // ── Productos: Pizzas ───────────────────────────────────────
  const pizzas: { name: string; price: number; recipe: RecipeLine[] }[] = [
    { name: 'Mozzarella', price: 8500, recipe: pizzaBase() },
    { name: 'Margarita', price: 9000, recipe: pizzaBase([{ ingredientId: ins.albahaca.id, quantity: 8 }]) },
    { name: 'Fugazza', price: 8000, recipe: [{ ingredientId: ins.masaPizza.id, quantity: 1 }, { ingredientId: ins.cebolla.id, quantity: 80 }, { ingredientId: ins.mozzarella.id, quantity: 60 }] },
    { name: 'Napolitana', price: 9500, recipe: pizzaBase([{ ingredientId: ins.albahaca.id, quantity: 5 }, { ingredientId: ins.aceitunas.id, quantity: 20 }]) },
    { name: 'Brujita', price: 9200, recipe: pizzaBase([{ ingredientId: ins.champignons.id, quantity: 50 }]) },
    { name: 'Luigi', price: 9800, recipe: pizzaBase([{ ingredientId: ins.panceta.id, quantity: 2 }, { ingredientId: ins.aceitunas.id, quantity: 15 }]) },
  ];

  const pizzaProducts: Awaited<ReturnType<typeof upsertProduct>>[] = [];
  for (const p of pizzas) {
    pizzaProducts.push(
      await upsertProduct(branch.id, p.name, catPizzas.id, p.price, PrintSector.COCINA, p.recipe),
    );
  }

  // ── Productos: Papas ──────────────────────────────────────
  const papasProducts = {
    cono: await upsertProduct(branch.id, 'Cono', catPapas.id, 2500, PrintSector.COCINA, [
      { ingredientId: ins.papas.id, quantity: 150 },
    ]),
    bandejita: await upsertProduct(branch.id, 'Bandejita', catPapas.id, 3200, PrintSector.COCINA, [
      { ingredientId: ins.papas.id, quantity: 300 },
    ]),
    cheddar: await upsertProduct(
      branch.id,
      'Papas c/ Cheddar',
      catPapas.id,
      3800,
      PrintSector.COCINA,
      [
        { ingredientId: ins.papas.id, quantity: 300 },
        { ingredientId: ins.cheddar.id, quantity: 3 },
      ],
    ),
    cheddarPanceta: await upsertProduct(
      branch.id,
      'Papas c/ Cheddar y panceta',
      catPapas.id,
      4500,
      PrintSector.COCINA,
      [
        { ingredientId: ins.papas.id, quantity: 300 },
        { ingredientId: ins.cheddar.id, quantity: 3 },
        { ingredientId: ins.panceta.id, quantity: 2 },
      ],
    ),
  };

  // ── Insumos bebidas (venta directa en carta) ────────────────
  const drinkDefs: { name: string; price: number; stock: number }[] = [
    { name: 'Schneider', price: 1500, stock: 48 },
    { name: 'Heineken', price: 1800, stock: 36 },
    { name: 'Coca grande', price: 2000, stock: 24 },
    { name: 'Sprite grande', price: 2000, stock: 24 },
    { name: 'Coca chica', price: 1200, stock: 48 },
    { name: 'Sprite chica', price: 1200, stock: 48 },
    { name: 'Saborizada Naranja Fliar', price: 1800, stock: 18 },
    { name: 'Saborizada Pomelo Fliar', price: 1800, stock: 18 },
    { name: 'Saborizada Naranja chica', price: 1200, stock: 36 },
    { name: 'Saborizada Pomelo chica', price: 1200, stock: 36 },
    { name: 'Agua Familiar', price: 1500, stock: 24 },
    { name: 'Agua chica', price: 900, stock: 48 },
    { name: 'Gin Tonic', price: 4500, stock: 999 },
    { name: 'Fernet', price: 3500, stock: 999 },
    { name: 'Campari', price: 3500, stock: 999 },
    { name: 'Mojito', price: 4000, stock: 999 },
    { name: 'Vino Blanco', price: 5000, stock: 24 },
    { name: 'Vino Tinto', price: 5000, stock: 24 },
  ];

  const drinks: { ing: Ingredient; price: number }[] = [];
  for (const d of drinkDefs) {
    const ing = await upsertIngredient(d.name, {
      kind: IngredientKind.BEBIDA,
      unit: UnitType.UNIDAD,
      currentStock: d.stock,
      minStock: Math.max(6, Math.floor(d.stock / 4)),
      cost: Math.round(d.price * 0.35),
    });
    drinks.push({ ing, price: d.price });
  }

  // ── Combo demo ──────────────────────────────────────────────
  const simple = burgerProducts.find((p) => p.name === 'Simple')!;

  const comboClasico = await prisma.combo.upsert({
    where: { id: 1 },
    update: {
      name: 'Combo Clásico',
      description: 'Simple + Cono de papas',
      price: 6200,
      active: true,
    },
    create: {
      name: 'Combo Clásico',
      description: 'Simple + Cono de papas',
      price: 6200,
      branchId: branch.id,
    },
  });

  await prisma.comboProduct.deleteMany({ where: { comboId: comboClasico.id } });
  await prisma.comboProduct.createMany({
    data: [
      { comboId: comboClasico.id, productId: simple.id, quantity: 1 },
      { comboId: comboClasico.id, productId: papasProducts.cono.id, quantity: 1 },
    ],
  });

  // ── Menú / Carta ────────────────────────────────────────────
  const secBurgers = await prisma.menuSection.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Hamburguesas' } },
    update: { sortOrder: 1 },
    create: { name: 'Hamburguesas', sortOrder: 1, branchId: branch.id },
  });
  const secPizzas = await prisma.menuSection.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Pizzas' } },
    update: { sortOrder: 2 },
    create: { name: 'Pizzas', sortOrder: 2, branchId: branch.id },
  });
  const secPapas = await prisma.menuSection.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Papas' } },
    update: { sortOrder: 3 },
    create: { name: 'Papas', sortOrder: 3, branchId: branch.id },
  });
  const secBebidas = await prisma.menuSection.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Bebidas' } },
    update: { sortOrder: 4 },
    create: { name: 'Bebidas', sortOrder: 4, branchId: branch.id },
  });
  const secCombos = await prisma.menuSection.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Combos' } },
    update: { sortOrder: 5 },
    create: { name: 'Combos', sortOrder: 5, branchId: branch.id },
  });

  await prisma.menuItem.deleteMany({ where: { branchId: branch.id } });

  const menuRows: {
    sectionId: number;
    type: MenuItemType;
    productId?: number;
    comboId?: number;
    ingredientId?: number;
    price: number;
    sortOrder: number;
  }[] = [];

  burgerProducts.forEach((p, i) => {
    menuRows.push({
      sectionId: secBurgers.id,
      type: MenuItemType.PRODUCT,
      productId: p.id,
      price: Number(p.price),
      sortOrder: i + 1,
    });
  });

  pizzaProducts.forEach((p, i) => {
    menuRows.push({
      sectionId: secPizzas.id,
      type: MenuItemType.PRODUCT,
      productId: p.id,
      price: Number(p.price),
      sortOrder: i + 1,
    });
  });

  Object.values(papasProducts).forEach((p, i) => {
    menuRows.push({
      sectionId: secPapas.id,
      type: MenuItemType.PRODUCT,
      productId: p.id,
      price: Number(p.price),
      sortOrder: i + 1,
    });
  });

  drinks.forEach((d, i) => {
    menuRows.push({
      sectionId: secBebidas.id,
      type: MenuItemType.INSUMO,
      ingredientId: d.ing.id,
      price: d.price,
      sortOrder: i + 1,
    });
  });

  menuRows.push({
    sectionId: secCombos.id,
    type: MenuItemType.COMBO,
    comboId: comboClasico.id,
    price: Number(comboClasico.price),
    sortOrder: 1,
  });

  await prisma.menuItem.createMany({ data: menuRows.map((r) => ({ ...r, branchId: branch.id })) });

  console.log('✅ Seed completado');
  console.log(`   ${burgers.length} hamburguesas, ${pizzas.length} pizzas, 4 papas, ${drinks.length} bebidas`);
  console.log('   admin / admin123  |  mozo1 / mozo123  |  caja1 / caja123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
