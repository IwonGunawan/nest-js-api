import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';

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
}
