import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryService } from '../inventory/inventory.service';
import { SearchService } from '../search/search.service';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { CategoriesService } from './categories.service';
import { checkServiceability, computeEffectivePrice } from './catalog.helpers';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    private inventoryService: InventoryService,
    private searchService: SearchService,
    private categoriesService: CategoriesService,
  ) {}

  async create(sellerId: string, dto: CreateProductDto) {
    const skus = dto.variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) {
      throw new BadRequestException('Duplicate SKUs within the same product');
    }
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
      variants: dto.variants.map(({ initialQuantity, ...v }) => v),
      fulfillment: dto.fulfillment,
      status: dto.status ?? 'draft',
    });

    await Promise.all(
      dto.variants.map((v) =>
        this.inventoryService.create({
          sku: v.sku,
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
    if (dto.images !== undefined) product.images = dto.images as any;
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
    await product.save();
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
