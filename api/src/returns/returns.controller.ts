import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/roles.enum';
import { CreateReturnDto, UpdateReturnDto } from './dto/return.dto';
import { ReturnsService } from './returns.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Roles(Role.Customer)
  @Post('orders/:orderId/items/:itemId/return')
  request(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.request(user.userId, orderId, itemId, dto);
  }

  @Roles(Role.Customer)
  @Get('me/returns')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.returnsService.findForUser(user.userId);
  }

  @Roles(Role.Seller)
  @Get('seller/returns')
  forSeller(@CurrentUser() user: AuthenticatedUser) {
    return this.returnsService.findForSeller(user.userId);
  }

  @Roles(Role.Seller)
  @Patch('seller/returns/:id')
  updateAsSeller(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReturnDto,
  ) {
    return this.returnsService.updateStatus(user.userId, id, dto.status);
  }

  @Roles(Role.Admin)
  @Get('admin/returns')
  forAdmin() {
    return this.returnsService.findAllForAdmin();
  }

  @Roles(Role.Admin)
  @Patch('admin/returns/:id')
  updateAsAdmin(@Param('id') id: string, @Body() dto: UpdateReturnDto) {
    return this.returnsService.updateStatus(null, id, dto.status);
  }
}
