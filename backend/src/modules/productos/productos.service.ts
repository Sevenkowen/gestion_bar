import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { IngredientKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductosService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
  ) {}

  findAll(branchId: number) {
    return this.prisma.product.findMany({
      where: { branchId, deletedAt: null },
      include: {
        category: true,
        recipe: { include: { ingredient: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  findAvailable(branchId: number) {
    return this.prisma.product.findMany({
      where: {
        branchId,
        active: true,
        deletedAt: null,
        manualAvailable: true,
        autoAvailable: true,
      },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
  }

  findOne(id: number, branchId: number) {
    return this.prisma.product.findFirst({
      where: { id, branchId, deletedAt: null },
      include: {
        category: true,
        recipe: { include: { ingredient: true } },
      },
    });
  }

  async create(branchId: number, dto: CreateProductDto) {
    await this.validateRecipe(dto.categoryId, dto.recipe);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        categoryId: dto.categoryId,
        printSector: dto.printSector,
        manualAvailable: dto.manualAvailable ?? true,
        branchId,
        recipe: dto.recipe?.length
          ? {
              create: dto.recipe.map((r) => ({
                ingredientId: r.ingredientId,
                quantity: r.quantity,
              })),
            }
          : undefined,
      },
      include: { category: true, recipe: { include: { ingredient: true } } },
    });
    await this.stockService.recalculateAllAvailability();
    return product;
  }

  async update(id: number, branchId: number, dto: UpdateProductDto) {
    const existing = await this.findOne(id, branchId);
    if (!existing) throw new NotFoundException('Producto no encontrado');

    const { recipe, ...data } = dto;

    const categoryId = data.categoryId ?? existing.categoryId;
    await this.validateRecipe(categoryId, recipe);

    await this.prisma.$transaction(async (tx) => {
      if (recipe !== undefined) {
        await tx.productIngredient.deleteMany({ where: { productId: id } });
        if (recipe.length) {
          await tx.productIngredient.createMany({
            data: recipe.map((r) => ({
              productId: id,
              ingredientId: r.ingredientId,
              quantity: r.quantity,
            })),
          });
        }
      }

      await tx.product.update({
        where: { id },
        data: {
          ...data,
          price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
        },
      });
    });

    await this.stockService.recalculateAllAvailability();
    return this.findOne(id, branchId);
  }

  async remove(id: number, branchId: number) {
    const existing = await this.findOne(id, branchId);
    if (!existing) throw new NotFoundException('Producto no encontrado');

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  /** Cocina → solo insumos COCINA. Bebidas → solo insumos BEBIDA. */
  private async validateRecipe(
    categoryId: number,
    recipe?: { ingredientId: number; quantity: number }[],
  ) {
    if (!recipe?.length) return;

    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    const isBebidaCategory = category?.name === 'Bebidas';
    const allowedKind = isBebidaCategory ? IngredientKind.BEBIDA : IngredientKind.COCINA;

    const ingredientIds = recipe.map((r) => r.ingredientId);
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
    });

    for (const ing of ingredients) {
      if (ing.kind !== allowedKind) {
        throw new UnprocessableEntityException(
          isBebidaCategory
            ? `En productos de bebida solo podés usar insumos tipo Bebida (${ing.name} es de cocina)`
            : `En recetas de comida no podés usar bebidas (${ing.name}). Agregalas al menú o a un combo.`,
        );
      }
    }
  }
}
