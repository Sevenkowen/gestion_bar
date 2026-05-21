import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateComboDto, UpdateComboDto } from './dto/combo.dto';

@Injectable()
export class CombosService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId: number) {
    return this.prisma.combo.findMany({
      where: { branchId, deletedAt: null },
      include: { products: { include: { product: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: number, branchId: number) {
    return this.prisma.combo.findFirst({
      where: { id, branchId, deletedAt: null },
      include: { products: { include: { product: true } } },
    });
  }

  async create(branchId: number, dto: CreateComboDto) {
    return this.prisma.combo.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        branchId,
        products: {
          create: dto.products.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
        },
      },
      include: { products: { include: { product: true } } },
    });
  }

  async update(id: number, branchId: number, dto: UpdateComboDto) {
    const existing = await this.findOne(id, branchId);
    if (!existing) throw new NotFoundException('Combo no encontrado');

    const { products, ...data } = dto;

    await this.prisma.$transaction(async (tx) => {
      if (products !== undefined) {
        await tx.comboProduct.deleteMany({ where: { comboId: id } });
        if (products.length) {
          await tx.comboProduct.createMany({
            data: products.map((p) => ({
              comboId: id,
              productId: p.productId,
              quantity: p.quantity,
            })),
          });
        }
      }

      await tx.combo.update({
        where: { id },
        data: {
          ...data,
          price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
        },
      });
    });

    return this.findOne(id, branchId);
  }

  async remove(id: number, branchId: number) {
    const existing = await this.findOne(id, branchId);
    if (!existing) throw new NotFoundException('Combo no encontrado');

    return this.prisma.combo.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}
