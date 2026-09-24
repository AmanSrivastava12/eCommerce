import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/roles.enum';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get('products')
  browse(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('inStock') inStock?: string,
    @Query('sort') sort?: string,
  ) {
    return this.productsService.browse({
      category,
      search,
      page: page ? Number(page) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      inStock: inStock === 'true',
      sort,
    });
  }

  @Public()
  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findPublicById(id);
  }

  @Public()
  @Get('products/:id/serviceability')
  serviceability(@Param('id') id: string, @Query('pincode') pincode: string) {
    return this.productsService.checkServiceabilityFor(id, pincode);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @Get('seller/products')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.productsService.findForSeller(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @Post('seller/products')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @Patch('seller/products/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @Delete('seller/products/:id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.productsService.remove(user.userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('admin/products')
  findAllForAdmin() {
    return this.productsService.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch('admin/products/:id/assured')
  setAssured(@Param('id') id: string, @Body('isAssured') isAssured: boolean) {
    return this.productsService.setAssuredBadge(id, isAssured);
  }
}
