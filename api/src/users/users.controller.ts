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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/roles.enum';
import { AddressDto } from './dto/address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.userId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.userId, dto);
  }

  @Post('me/password')
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.userId, dto);
  }

  @Get('me/addresses')
  listAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listAddresses(user.userId);
  }

  @Post('me/addresses')
  addAddress(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddressDto) {
    return this.usersService.addAddress(user.userId, dto);
  }

  @Patch('me/addresses/:id')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<AddressDto>,
  ) {
    return this.usersService.updateAddress(user.userId, id, dto);
  }

  @Delete('me/addresses/:id')
  removeAddress(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.removeAddress(user.userId, id);
  }

  @Roles(Role.Admin)
  @Get('admin/sellers')
  listSellers(@Query('status') status?: string) {
    return status === 'pending'
      ? this.usersService.listPendingSellers()
      : this.usersService.listAll({ role: Role.Seller });
  }

  @Roles(Role.Admin)
  @Patch('admin/sellers/:id/verify')
  verifySeller(
    @Param('id') id: string,
    @Body('status') status: 'pending' | 'verified' | 'rejected',
  ) {
    return this.usersService.setSellerVerification(id, status);
  }

  @Roles(Role.Admin)
  @Get('admin/users')
  listUsers(@Query('role') role?: string) {
    return this.usersService.listAll({ role });
  }

  @Roles(Role.Admin)
  @Patch('admin/users/:id/deactivate')
  deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
