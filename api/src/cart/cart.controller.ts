import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CartService } from './cart.service';
import { AddCartItemDto, ApplyCouponDto, UpdateCartItemDto } from './dto/cart.dto';

function extractUserId(req: Request): string | undefined {
  return (req as any).user?.userId;
}

// Class-level guard only *attempts* auth (never rejects) so both guests and logged-in
// users can use the cart; each route below is individually marked @Public() to skip the
// app-wide mandatory guard except /merge, which requires a real logged-in user.
@UseGuards(OptionalJwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public()
  @Get()
  getCart(@Req() req: Request, @Query('guestSessionId') guestSessionId?: string) {
    return this.cartService.getCart(extractUserId(req), guestSessionId);
  }

  @Public()
  @Post('items')
  addItem(@Req() req: Request, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(extractUserId(req), dto);
  }

  @Public()
  @Patch('items/:sku')
  updateItem(
    @Req() req: Request,
    @Param('sku') sku: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(extractUserId(req), sku, dto);
  }

  @Public()
  @Delete('items/:sku')
  removeItem(
    @Req() req: Request,
    @Param('sku') sku: string,
    @Query('guestSessionId') guestSessionId?: string,
  ) {
    return this.cartService.removeItem(extractUserId(req), sku, guestSessionId);
  }

  @Public()
  @Post('coupon')
  applyCoupon(@Req() req: Request, @Body() dto: ApplyCouponDto) {
    return this.cartService.applyCoupon(extractUserId(req), dto);
  }

  @Public()
  @Delete('coupon/:code')
  removeCoupon(
    @Req() req: Request,
    @Param('code') code: string,
    @Query('guestSessionId') guestSessionId?: string,
  ) {
    return this.cartService.removeCoupon(extractUserId(req), code, guestSessionId);
  }

  // Not @Public() — requires a real authenticated user via the app-wide JwtAuthGuard.
  @UseGuards(JwtAuthGuard)
  @Post('merge')
  merge(@Req() req: Request, @Body('guestSessionId') guestSessionId: string) {
    return this.cartService.mergeGuestCart(extractUserId(req)!, guestSessionId);
  }
}
