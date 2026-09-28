import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model, Types } from 'mongoose';
import { In, Not, Repository } from 'typeorm';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import { OrderItem } from '../orders/entities/order-item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { SearchService } from '../search/search.service';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { CategoriesService } from './categories.service';
import { checkServiceability, computeEffectivePrice } from './catalog.helpers';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Product, ProductDocument, ProductVariant } from './schemas/product.schema';

type VariantInput = {
  sku: string;
  attributes?: Record<string, string>;
  priceOverride?: number | null;
  images?: string[];
};

/** Trims SKUs and attribute pairs, dropping empty ones, so storefront labels stay clean. */
function normalizeVariant(v: VariantInput): ProductVariant {
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(v.attributes ?? {})) {
    const k = String(key).trim();
    const val = String(value ?? '').trim();
    if (k && val) attributes[k] = val;
  }
  return {
    sku: v.sku.trim(),
    attributes,
    priceOverride: v.priceOverride ?? null,
    images: (v.images ?? []).filter(Boolean),
  };
}

function assertDistinctVariants(variants: ProductVariant[]) {
  const skus = variants.map((v) => v.sku.toLowerCase());
  if (new Set(skus).size !== skus.length) {
    throw new BadRequestException('Each variant needs a different SKU');
  }
  if (variants.length > 1) {
    const labels = variants.map((v) =>
      Object.entries(v.attributes)
        .map(([k, val]) => `${k.toLowerCase()}=${val.toLowerCase()}`)
        .sort()
        .join('|'),
    );
    if (labels.some((l) => !l)) {
      throw new BadRequestException('When a product has several variants, give each one at least one option (e.g. Color: Black)');
    }
    if (new Set(labels).size !== labels.length) {
      throw new BadRequestException('Two variants have the same options — make each combination unique');
    }
  }
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    private inventoryService: InventoryService,
    private searchService: SearchService,
    private categoriesService: CategoriesService,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectRepository(OrderItem) private orderItemsRepo: Repository<OrderItem>,
  ) {}

  /** SKUs are globally unique (they key the inventory table), not just unique per product. */
  private async assertSkusAvailable(skus: string[]) {
    const taken = await this.inventoryService.findBySkus(skus);
    if (taken.length > 0) {
      throw new BadRequestException(`SKU already in use: ${taken.map((t) => t.sku).join(', ')}`);
    }
  }

  /**
   * A variant can't be removed while customers still depend on it: it's in an order that
   * hasn't been delivered, or sitting in someone's cart.
   */
  private async assertRemovable(skus: string[]) {
    if (skus.length === 0) return;
    const openItems = await this.orderItemsRepo.find({
      where: { sku: In(skus), fulfillment_status: Not('delivered') },
      relations: { order: true },
    });
    const blockedByOrders = [...new Set(openItems.filter((i) => i.order?.status !== 'cancelled').map((i) => i.sku))];
    if (blockedByOrders.length) {
      throw new BadRequestException(
        `Can't remove ${blockedByOrders.join(', ')} — it has orders that aren't delivered yet. Set its stock to 0 instead.`,
      );
    }
    const carts = await this.cartModel.find({ 'items.sku': { $in: skus } }, { 'items.sku': 1 }).lean().exec();
    const blockedByCarts = [...new Set(carts.flatMap((c) => c.items.map((i) => i.sku)).filter((sku) => skus.includes(sku)))];
    if (blockedByCarts.length) {
      throw new BadRequestException(
        `Can't remove ${blockedByCarts.join(', ')} — it's in customers' carts. Set its stock to 0 instead.`,
      );
    }
  }

  async create(sellerId: string, dto: CreateProductDto) {
    // The schema requires a main image; without this check an empty one surfaces as a 500.
    if (!dto.images.main?.trim()) throw new BadRequestException('Add a main product photo');
    const variants = dto.variants.map(normalizeVariant);
    assertDistinctVariants(variants);
    // Check before writing anything: the inventory insert would otherwise fail after the
    // product document already exists, leaving a product with no stock rows.
    await this.assertSkusAvailable(variants.map((v) => v.sku));
    const product = await this.productModel.create({
      sellerId: new Types.ObjectId(sellerId),
      title: dto.title,
      categoryId: new Types.ObjectId(dto.categoryId),
      description: dto.description,
      faqs: dto.faqs,
      images: dto.images,
      pricing: {
        ...dto.pricing,
        activeSaleId: dto.pricing.activeSaleId ? new Types.ObjectId(dto.pricing.activeSaleId) : null,
      },
      variants,
      fulfillment: dto.fulfillment,
      status: dto.status ?? 'draft',
    });

    await Promise.all(
      dto.variants.map((v) =>
        this.inventoryService.create({
          sku: v.sku.trim(),
          product_id: String(product._id),
          seller_id: sellerId,
          quantity: v.initialQuantity,
        }),
      ),
    );

    await this.reindex(product);
    return product;
  }

  async update(sellerId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.findOwnedOrThrow(sellerId, productId);
    if (dto.title !== undefined) product.title = dto.title;
    if (dto.categoryId !== undefined) product.categoryId = new Types.ObjectId(dto.categoryId);
    if (dto.description !== undefined) product.description = dto.description as any;
    if (dto.faqs !== undefined) product.faqs = dto.faqs as any;
    if (dto.images !== undefined) {
      if (!dto.images.main?.trim()) throw new BadRequestException('Add a main product photo');
      product.images = dto.images as any;
    }
    if (dto.fulfillment !== undefined) {
      const { isAssured: _ignoredIsAssured, ...rest } = dto.fulfillment;
      Object.assign(product.fulfillment, rest);
    }
    if (dto.pricing !== undefined) {
      Object.assign(product.pricing, {
        ...dto.pricing,
        activeSaleId: dto.pricing.activeSaleId
          ? new Types.ObjectId(dto.pricing.activeSaleId)
          : dto.pricing.activeSaleId,
      });
    }
    if (dto.status !== undefined) product.status = dto.status;

    let added: { sku: string; quantity: number }[] = [];
    let removed: string[] = [];
    if (dto.variants !== undefined) {
      const next = dto.variants.map(normalizeVariant);
      assertDistinctVariants(next);
      const current = new Set(product.variants.map((v) => v.sku));
      const nextSkus = new Set(next.map((v) => v.sku));
      added = dto.variants
        .filter((v) => !current.has(v.sku.trim()))
        .map((v) => ({ sku: v.sku.trim(), quantity: v.initialQuantity ?? 0 }));
      removed = [...current].filter((sku) => !nextSkus.has(sku));
      await this.assertSkusAvailable(added.map((a) => a.sku));
      await this.assertRemovable(removed);
      product.variants = next as any;
    }

    await product.save();
    for (const a of added) {
      await this.inventoryService.create({ sku: a.sku, product_id: String(product._id), seller_id: sellerId, quantity: a.quantity });
    }
    if (removed.length) await this.inventoryService.removeSkus(sellerId, removed);
    await this.reindex(product);
    return product;
  }

  async setAssuredBadge(productId: string, isAssured: boolean) {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');
    product.fulfillment.isAssured = isAssured;
    await product.save();
    return product;
  }

  async remove(sellerId: string, productId: string) {
    const product = await this.findOwnedOrThrow(sellerId, productId);
    await product.deleteOne();
    // Free the SKUs so they can be reused (orders keep their own copy of the SKU).
    await this.inventoryService.removeSkus(sellerId, product.variants.map((v) => v.sku));
    await this.searchService.removeProduct(productId);
    return { deleted: true };
  }

  async findForSeller(sellerId: string) {
    return this.productModel.find({ sellerId: new Types.ObjectId(sellerId) }).exec();
  }

  async findAllForAdmin() {
    return this.productModel.find().exec();
  }

  async findPublicById(id: string) {
    const productDoc = await this.productModel.findOne({ _id: id, status: 'active' }).exec();
    if (!productDoc) throw new NotFoundException('Product not found');
    const activeSale = productDoc.pricing.activeSaleId
      ? await this.saleModel.findById(productDoc.pricing.activeSaleId).exec()
      : null;
    const price = computeEffectivePrice(productDoc.pricing, activeSale);

    const product = productDoc.toObject();
    const inventoryItems = await this.inventoryService.findBySkus(
      product.variants.map((v) => v.sku),
    );
    const availableBySku = new Map(
      inventoryItems.map((item) => [item.sku, this.inventoryService.availableQuantity(item)]),
    );
    product.variants = product.variants.map((v) => ({
      ...v,
      availableQty: availableBySku.get(v.sku) ?? null,
      // Each variant's own price (its override run through the same discount/sale rules).
      price: this.variantPrice(productDoc.pricing, v, activeSale),
    }));

    return { product, price };
  }

  async browse(query: {
    category?: string;
    search?: string;
    page?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStock?: boolean;
    sort?: string;
  }) {
    const filter: Record<string, unknown> = { status: 'active' };
    if (query.category) {
      // `categoryId` is declared with `type: Types.ObjectId`, which Mongoose registers as a
      // Mixed path — so a string from the query string is never cast and matches nothing.
      // Cast explicitly; an id that isn't an ObjectId can't match any product.
      if (!Types.ObjectId.isValid(query.category)) return [];
      // Include subcategories too, so browsing a parent (e.g. "Electronics") also surfaces
      // products filed directly under its children (e.g. "Audio", "Wearables").
      const categoryIds = await this.categoriesService.findWithDescendantIds(query.category);
      filter.categoryId = { $in: categoryIds };
    }
    if (query.minPrice || query.maxPrice) {
      filter['pricing.basePrice'] = {
        ...(query.minPrice ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice ? { $lte: query.maxPrice } : {}),
      };
    }
    if (query.minRating) filter['ratingSummary.average'] = { $gte: query.minRating };
    if (query.search) filter.$text = { $search: query.search };

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      'price-asc': { 'pricing.basePrice': 1 },
      'price-desc': { 'pricing.basePrice': -1 },
      rating: { 'ratingSummary.average': -1 },
      newest: { createdAt: -1 },
    };
    const sort = sortMap[query.sort ?? ''] ?? { createdAt: -1 };
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = 20;

    return this.productModel
      .find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
  }

  variantPrice(
    pricing: Product['pricing'],
    variant: Pick<ProductVariant, 'priceOverride'> | undefined,
    activeSale: Parameters<typeof computeEffectivePrice>[1],
  ) {
    // `pricing` is usually a Mongoose subdocument; spreading one copies its internals rather
    // than its fields, so convert to a plain object before overriding the base price.
    const plain = (pricing as { toObject?: () => Product['pricing'] }).toObject?.() ?? pricing;
    const basePrice = variant?.priceOverride ?? plain.basePrice;
    return computeEffectivePrice({ ...plain, basePrice }, activeSale);
  }

  async checkServiceabilityFor(productId: string, pincode: string) {
    const product = await this.productModel.findById(productId).exec();
    if (!product) throw new NotFoundException('Product not found');
    return checkServiceability(product.fulfillment, pincode);
  }

  async recalculateRatingSummary(productId: string, average: number, count: number) {
    await this.productModel
      .findByIdAndUpdate(productId, { $set: { ratingSummary: { average, count } } })
      .exec();
  }

  private async reindex(product: ProductDocument) {
    await this.searchService.indexProduct({
      id: String(product._id),
      title: product.title,
      short: product.description.short,
      categoryId: String(product.categoryId),
      basePrice: product.pricing.basePrice,
      status: product.status,
    });
  }

  private async findOwnedOrThrow(sellerId: string, productId: string) {
    const product = await this.productModel.findById(productId).exec();
    if (!product) throw new NotFoundException('Product not found');
    if (String(product.sellerId) !== sellerId) {
      throw new ForbiddenException('You do not own this product');
    }
    return product;
  }
}
