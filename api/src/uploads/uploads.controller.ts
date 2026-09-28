import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/roles.enum';
import { PresignProductImageDto } from './dto/presign-product-image.dto';
import { UploadsService } from './uploads.service';

@Controller()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  @Post('seller/uploads/product-image')
  presignProductImage(@CurrentUser() user: AuthenticatedUser, @Body() dto: PresignProductImageDto) {
    return this.uploadsService.presignProductImage(user.userId, dto.contentType);
  }
}
