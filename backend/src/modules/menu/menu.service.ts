import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MenuItemType, IngredientKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMenuSectionDto, UpdateMenuSectionDto } from './dto/menu-section.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto';

const sectionInclude = {
  items: {
    include: {
      product: { include: { category: true } },
      combo: { include: { products: { include: { product: true } } } },
      ingredient: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
};

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  findAllSections(branchId: number) {
    return this.prisma.menuSection.findMany({
      where: { branchId },
      include: sectionInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createSection(branchId: number, dto: CreateMenuSectionDto) {
    const exists = await this.prisma.menuSection.findUnique({
      where: { branchId_name: { branchId, name: dto.name } },
    });
    if (exists) throw new ConflictException('Ya existe esa sección');

    return this.prisma.menuSection.create({
      data: {
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
        branchId,
      },
      include: sectionInclude,
    });
  }

  async updateSection(id: number, branchId: number, dto: UpdateMenuSectionDto) {
    const section = await this.prisma.menuSection.findFirst({ where: { id, branchId } });
    if (!section) throw new NotFoundException('Sección no encontrada');

    if (dto.name && dto.name !== section.name) {
      const exists = await this.prisma.menuSection.findUnique({
        where: { branchId_name: { branchId, name: dto.name } },
      });
      if (exists) throw new ConflictException('Ya existe esa sección');
    }

    return this.prisma.menuSection.update({
      where: { id },
      data: dto,
      include: sectionInclude,
    });
  }

  async removeSection(id: number, branchId: number) {
    const section = await this.prisma.menuSection.findFirst({ where: { id, branchId } });
    if (!section) throw new NotFoundException('Sección no encontrada');
    await this.prisma.menuSection.delete({ where: { id } });
    return { ok: true };
  }

  async createItem(branchId: number, dto: CreateMenuItemDto) {
    const section = await this.prisma.menuSection.findFirst({
      where: { id: dto.sectionId, branchId },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');

    await this.validateItemReference(branchId, dto.type, dto);

    const count = await this.prisma.menuItem.count({ where: { sectionId: dto.sectionId } });

    return this.prisma.menuItem.create({
      data: {
        sectionId: dto.sectionId,
        type: dto.type,
        productId: dto.type === MenuItemType.PRODUCT ? dto.productId : null,
        comboId: dto.type === MenuItemType.COMBO ? dto.comboId : null,
        ingredientId: dto.type === MenuItemType.INSUMO ? dto.ingredientId : null,
        price: dto.price,
        sortOrder: dto.sortOrder ?? count + 1,
        visible: dto.visible ?? true,
        branchId,
      },
      include: {
        product: true,
        combo: true,
        ingredient: true,
        section: true,
      },
    });
  }

  async updateItem(id: number, branchId: number, dto: UpdateMenuItemDto) {
    const item = await this.prisma.menuItem.findFirst({ where: { id, branchId } });
    if (!item) throw new NotFoundException('Ítem de menú no encontrado');

    if (dto.sectionId) {
      const section = await this.prisma.menuSection.findFirst({
        where: { id: dto.sectionId, branchId },
      });
      if (!section) throw new NotFoundException('Sección no encontrada');
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: dto,
      include: {
        product: true,
        combo: true,
        ingredient: true,
        section: true,
      },
    });
  }

  async removeItem(id: number, branchId: number) {
    const item = await this.prisma.menuItem.findFirst({ where: { id, branchId } });
    if (!item) throw new NotFoundException('Ítem de menú no encontrado');
    await this.prisma.menuItem.delete({ where: { id } });
    return { ok: true };
  }

  /** Carta para mozos: secciones activas con ítems visibles y disponibles */
  async findCarta(branchId: number) {
    const sections = await this.prisma.menuSection.findMany({
      where: { branchId, active: true },
      include: {
        items: {
          where: { visible: true },
          include: {
            product: { include: { category: true } },
            combo: { include: { products: { include: { product: true } } } },
            ingredient: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return sections
      .map((section) => ({
        id: section.id,
        name: section.name,
        sortOrder: section.sortOrder,
        items: section.items
          .map((item) => this.mapCartaItem(item))
          .filter((item) => item.available),
      }))
      .filter((section) => section.items.length > 0);
  }

  async findMenuItemForOrder(menuItemId: number, branchId: number) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, branchId, visible: true },
      include: {
        product: true,
        combo: { include: { products: { include: { product: true } } } },
        ingredient: true,
        section: true,
      },
    });
    if (!item) throw new NotFoundException('Ítem de menú no encontrado');
    if (!item.section.active) {
      throw new UnprocessableEntityException('Sección de menú no disponible');
    }

    const cartaItem = this.mapCartaItem(item);
    if (!cartaItem.available) {
      throw new UnprocessableEntityException(`${cartaItem.name} no está disponible`);
    }

    return item;
  }

  private mapCartaItem(item: {
    id: number;
    type: MenuItemType;
    price: Prisma.Decimal;
    sortOrder: number;
    product: {
      id: number;
      name: string;
      description: string | null;
      image: string | null;
      manualAvailable: boolean;
      autoAvailable: boolean;
      active: boolean;
      deletedAt: Date | null;
    } | null;
    combo: {
      id: number;
      name: string;
      description: string | null;
      image: string | null;
      active: boolean;
      deletedAt: Date | null;
      products: { product: { manualAvailable: boolean; autoAvailable: boolean } }[];
    } | null;
    ingredient: {
      id: number;
      name: string;
      currentStock: Prisma.Decimal;
      active: boolean;
    } | null;
  }) {
    let name = '';
    let description: string | null = null;
    let image: string | null = null;
    let available = false;

    if (item.type === MenuItemType.PRODUCT && item.product) {
      name = item.product.name;
      description = item.product.description;
      image = item.product.image;
      available =
        item.product.active &&
        !item.product.deletedAt &&
        item.product.manualAvailable &&
        item.product.autoAvailable;
    } else if (item.type === MenuItemType.COMBO && item.combo) {
      name = item.combo.name;
      description = item.combo.description;
      image = item.combo.image;
      available =
        item.combo.active &&
        !item.combo.deletedAt &&
        item.combo.products.every(
          (cp) => cp.product.manualAvailable && cp.product.autoAvailable,
        );
    } else if (item.type === MenuItemType.INSUMO && item.ingredient) {
      name = item.ingredient.name;
      available = item.ingredient.active && item.ingredient.currentStock.gte(1);
    }

    return {
      id: item.id,
      type: item.type,
      name,
      description,
      image,
      price: item.price.toString(),
      sortOrder: item.sortOrder,
      available,
    };
  }

  private async validateItemReference(
    branchId: number,
    type: MenuItemType,
    dto: CreateMenuItemDto,
  ) {
    if (type === MenuItemType.PRODUCT) {
      if (!dto.productId) throw new UnprocessableEntityException('Debe indicar producto');
      const product = await this.prisma.product.findFirst({
        where: { id: dto.productId, branchId, deletedAt: null },
      });
      if (!product) throw new NotFoundException('Producto no encontrado');
    } else if (type === MenuItemType.COMBO) {
      if (!dto.comboId) throw new UnprocessableEntityException('Debe indicar combo');
      const combo = await this.prisma.combo.findFirst({
        where: { id: dto.comboId, branchId, deletedAt: null },
      });
      if (!combo) throw new NotFoundException('Combo no encontrado');
    } else if (type === MenuItemType.INSUMO) {
      if (!dto.ingredientId) throw new UnprocessableEntityException('Debe indicar insumo');
      const ingredient = await this.prisma.ingredient.findUnique({
        where: { id: dto.ingredientId },
      });
      if (!ingredient) throw new NotFoundException('Insumo no encontrado');
      if (ingredient.kind !== IngredientKind.BEBIDA) {
        throw new UnprocessableEntityException(
          'Solo insumos tipo Bebida pueden agregarse al menú directamente',
        );
      }
    }
  }
}
