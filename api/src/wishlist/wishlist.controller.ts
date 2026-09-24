import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WishlistService } from './wishlist.service';

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlistService.get(user.userId);
  }

  @Post('items')
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Body('productId') productId: string,
    @Body('sku') sku: string,
    @Body('collectionName') collectionName?: string,
  ) {
    return this.wishlistService.addItem(user.userId, productId, sku, collectionName);
  }

  @Delete('items/:sku')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('sku') sku: string) {
    return this.wishlistService.removeItem(user.userId, sku);
  }

  @Patch('items/:sku')
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sku') sku: string,
    @Body('collectionName') collectionName: string,
  ) {
    return this.wishlistService.moveItem(user.userId, sku, collectionName);
  }

  @Patch('collections/:name')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('name') name: string,
    @Body('name') newName: string,
  ) {
    return this.wishlistService.renameCollection(user.userId, name, newName);
  }

  @Delete('collections/:name')
  removeCollection(@CurrentUser() user: AuthenticatedUser, @Param('name') name: string) {
    return this.wishlistService.deleteCollection(user.userId, name);
  }
}
