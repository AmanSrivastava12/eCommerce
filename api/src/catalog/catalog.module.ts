import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart, CartSchema } from '../cart/schemas/cart.schema';
import { OrderItem } from '../orders/entities/order-item.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { SearchModule } from '../search/search.module';
import { Sale, SaleSchema } from '../sales/schemas/sale.schema';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Category, CategorySchema } from './schemas/category.schema';
import { Product, ProductSchema } from './schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Sale.name, schema: SaleSchema },
      // Read-only: used to stop a seller removing a variant that's in carts or open orders.
      { name: Cart.name, schema: CartSchema },
    ]),
    TypeOrmModule.forFeature([OrderItem]),
    InventoryModule,
    SearchModule,
  ],
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService, CategoriesService],
  exports: [ProductsService],
})
export class CatalogModule {}
