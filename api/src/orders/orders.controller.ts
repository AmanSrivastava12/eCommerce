import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/roles.enum';
import { CheckoutPaymentDto, CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.Customer)
  @Post('checkout/payment-intent')
  createCheckoutPayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutPaymentDto) {
    return this.ordersService.createCheckoutPayment(user.userId, dto.addressId);
  }

  @Roles(Role.Customer)
  @Post('orders')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.placeOrder(user.userId, dto);
  }

  @Roles(Role.Customer)
  @Get('orders')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ordersService.findForUser(user.userId, { status, from, to });
  }

  @Roles(Role.Customer)
  @Get('orders/:id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.findOneForUser(user.userId, id);
  }

  @Roles(Role.Customer)
  @Post('orders/:id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.cancelOwnOrder(user.userId, id);
  }

  @Roles(Role.Seller)
  @Get('seller/orders')
  findForSeller(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ordersService.findForSeller(user.userId, { status, from, to });
  }

  @Roles(Role.Seller)
  @Post('seller/orders/:orderId/items/:itemId/fulfill')
  fulfill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body('status') status: 'shipped' | 'delivered',
  ) {
    return this.ordersService.fulfillItem(user.userId, orderId, itemId, status);
  }

  @Roles(Role.Admin)
  @Get('admin/orders')
  findAllForAdmin() {
    return this.ordersService.findAllForAdmin();
  }
}
