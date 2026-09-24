import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/roles.enum';
import { ProductsService } from '../catalog/products.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly productsService: ProductsService,
  ) {}

  @Public()
  @Get('products/:id/reviews')
  findForProduct(@Param('id') id: string, @Query('sku') sku?: string) {
    return this.reviewsService.findForProduct(id, sku);
  }

  // Not @Public(): the app-wide JwtAuthGuard rejects unauthenticated requests before this
  // handler runs, and ReviewsService.create separately enforces the verified-purchase rule.
  @UseGuards(JwtAuthGuard)
  @Post('products/:id/reviews')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @Get('seller/reviews')
  async findForSeller(@CurrentUser() user: AuthenticatedUser) {
    const products = await this.productsService.findForSeller(user.userId);
    return this.reviewsService.findForSeller(products.map((p) => String(p._id)));
  }
}
