import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/roles.enum';
import { BankAccountDto, CreatePayoutDto } from './dto/seller.dto';
import { SellerService } from './seller.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Seller)
@Controller('seller')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Get('order-groups')
  listOrders(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string) {
    return this.sellerService.listOrders(user.userId, status || undefined);
  }

  @Get('orders/:orderId')
  getOrder(@CurrentUser() user: AuthenticatedUser, @Param('orderId') orderId: string) {
    return this.sellerService.getOrder(user.userId, orderId);
  }

  @Get('finance')
  finance(@CurrentUser() user: AuthenticatedUser) {
    return this.sellerService.getFinance(user.userId);
  }

  @Post('finance/payouts')
  payout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePayoutDto) {
    return this.sellerService.createPayout(user.userId, dto);
  }

  @Put('finance/bank-account')
  setBankAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: BankAccountDto) {
    return this.sellerService.setBankAccount(user.userId, dto);
  }
}
