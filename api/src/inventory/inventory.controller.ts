import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/roles.enum';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Seller)
@Controller('seller/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Patch(':sku')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sku') sku: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventoryService.updateForSeller(user.userId, sku, dto);
  }
}
