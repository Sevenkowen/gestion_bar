import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId: number) {
    return this.prisma.category.findMany({
      where: { branchId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(branchId: number, dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findFirst({
      where: { branchId, name: dto.name },
    });
    if (exists) throw new ConflictException('Ya existe una categoría con ese nombre');

    return this.prisma.category.create({
      data: { ...dto, branchId },
    });
  }

  async update(id: number, branchId: number, dto: UpdateCategoryDto) {
    await this.findOne(id, branchId);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: number, branchId: number) {
    await this.findOne(id, branchId);
    return this.prisma.category.update({
      where: { id },
      data: { active: false },
    });
  }

  private async findOne(id: number, branchId: number) {
    const cat = await this.prisma.category.findFirst({ where: { id, branchId } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }
}
