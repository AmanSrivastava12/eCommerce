import { Controller, Delete, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard)
@Controller('me/payment-methods')
export class PaymentMethodsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const me = await this.usersService.findById(user.userId);
    if (!me?.stripeCustomerId) return [];
    return this.paymentsService.listSavedPaymentMethods(me.stripeCustomerId);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const me = await this.usersService.findById(user.userId);
    if (!me?.stripeCustomerId) throw new NotFoundException('No saved payment methods');
    await this.paymentsService.detachPaymentMethod(id, me.stripeCustomerId);
    return { removed: true };
  }
}
