import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../common/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Step 1: redirect ke Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  // Step 2: Google callback, generate JWT
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(
    @Req()
    req: Request & {
      user: {
        email: string;
        name: string;
      };
    },
  ) {
    return this.authService.loginWithGoogle(req?.user);
  }

  // Ubah password untuk user yang sedang login (user.id dari JWT)
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: User) {
    return this.authService.changePassword(user.id, dto);
  }
}
