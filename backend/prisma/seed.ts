import {
  PrismaClient,
  RoleName,
  PrintSector,
  IngredientKind,
  UnitType,
  TableStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SistemaBar...');

  const branch = await prisma.branch.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Local Principal', address: 'Av. Principal 123' },
  });

  const passwordHash = await bcrypt.hash('admin123', 12);

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

  const mozoHash = await bcrypt.hash('mozo123', 12);
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

  const cajaHash = await bcrypt.hash('caja123', 12);
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

  // Mesas
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

  // Impresoras demo (IPs a configurar en producción)
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

  // Categorías
  const catBurgers = await prisma.category.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Hamburguesas' } },
    update: {},
    create: { name: 'Hamburguesas', sortOrder: 1, branchId: branch.id },
  });

  const catBebidas = await prisma.category.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Bebidas' } },
    update: {},
    create: { name: 'Bebidas', sortOrder: 2, branchId: branch.id },
  });

  const catPapas = await prisma.category.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Acompañamientos' } },
    update: {},
    create: { name: 'Acompañamientos', sortOrder: 3, branchId: branch.id },
  });

  // Ingredientes
  const pan = await prisma.ingredient.upsert({
    where: { name: 'Pan' },
    update: {},
    create: { name: 'Pan', unit: UnitType.UNIDAD, currentStock: 50, minStock: 10, cost: 80 },
  });

  const medallon = await prisma.ingredient.upsert({
    where: { name: 'Medallón' },
    update: {},
    create: { name: 'Medallón', unit: UnitType.UNIDAD, currentStock: 100, minStock: 20, cost: 350 },
  });

  const cheddar = await prisma.ingredient.upsert({
    where: { name: 'Cheddar' },
    update: {},
    create: { name: 'Cheddar', unit: UnitType.UNIDAD, currentStock: 200, minStock: 40, cost: 50 },
  });

  const papas = await prisma.ingredient.upsert({
    where: { name: 'Papas' },
    update: {},
    create: { name: 'Papas', unit: UnitType.GRAMO, currentStock: 10000, minStock: 2000, cost: 0.5 },
  });

  const cocaCola = await prisma.ingredient.upsert({
    where: { name: 'Coca Cola' },
    update: { kind: IngredientKind.BEBIDA },
    create: {
      name: 'Coca Cola',
      kind: IngredientKind.BEBIDA,
      unit: UnitType.UNIDAD,
      currentStock: 48,
      minStock: 12,
      cost: 400,
    },
  });

  // Productos
  const dobleCheese = await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Doble Cheese',
      description: 'Doble medallón con cheddar',
      price: 4500,
      categoryId: catBurgers.id,
      printSector: PrintSector.COCINA,
      branchId: branch.id,
    },
  });

  await prisma.productIngredient.createMany({
    data: [
      { productId: dobleCheese.id, ingredientId: pan.id, quantity: 1 },
      { productId: dobleCheese.id, ingredientId: medallon.id, quantity: 2 },
      { productId: dobleCheese.id, ingredientId: cheddar.id, quantity: 4 },
    ],
    skipDuplicates: true,
  });

  const papasGrandes = await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Papas Grandes',
      price: 1800,
      categoryId: catPapas.id,
      printSector: PrintSector.COCINA,
      branchId: branch.id,
    },
  });

  await prisma.productIngredient.createMany({
    data: [{ productId: papasGrandes.id, ingredientId: papas.id, quantity: 300 }],
    skipDuplicates: true,
  });

  const coca = await prisma.product.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Coca Cola',
      price: 1200,
      categoryId: catBebidas.id,
      printSector: PrintSector.BARRA,
      branchId: branch.id,
    },
  });

  await prisma.productIngredient.createMany({
    data: [{ productId: coca.id, ingredientId: cocaCola.id, quantity: 1 }],
    skipDuplicates: true,
  });

  // Combo
  const comboBurger = await prisma.combo.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Combo Burger',
      description: 'Doble Cheese + Papas + Coca',
      price: 6500,
      branchId: branch.id,
    },
  });

  await prisma.comboProduct.createMany({
    data: [
      { comboId: comboBurger.id, productId: dobleCheese.id, quantity: 1 },
      { comboId: comboBurger.id, productId: papasGrandes.id, quantity: 1 },
      { comboId: comboBurger.id, productId: coca.id, quantity: 1 },
    ],
    skipDuplicates: true,
  });

  // Menú / Carta
  const secBurgers = await prisma.menuSection.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Hamburguesas' } },
    update: {},
    create: { name: 'Hamburguesas', sortOrder: 1, branchId: branch.id },
  });

  const secCombos = await prisma.menuSection.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Combos' } },
    update: {},
    create: { name: 'Combos', sortOrder: 2, branchId: branch.id },
  });

  const secBebidas = await prisma.menuSection.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Bebidas' } },
    update: {},
    create: { name: 'Bebidas', sortOrder: 3, branchId: branch.id },
  });

  await prisma.menuItem.upsert({
    where: { id: 1 },
    update: {},
    create: {
      sectionId: secBurgers.id,
      type: 'PRODUCT',
      productId: dobleCheese.id,
      price: dobleCheese.price,
      sortOrder: 1,
      branchId: branch.id,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: 2 },
    update: {},
    create: {
      sectionId: secCombos.id,
      type: 'COMBO',
      comboId: comboBurger.id,
      price: comboBurger.price,
      sortOrder: 1,
      branchId: branch.id,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: 3 },
    update: {},
    create: {
      sectionId: secBebidas.id,
      type: 'INSUMO',
      ingredientId: cocaCola.id,
      price: 1200,
      sortOrder: 1,
      branchId: branch.id,
    },
  });

  console.log('✅ Seed completado');
  console.log('   admin / admin123');
  console.log('   mozo1 / mozo123');
  console.log('   caja1 / caja123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
