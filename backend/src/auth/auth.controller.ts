import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: {
    email: string;
    password: string;
    role: 'CUSTOMER' | 'BUSINESS';
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {
    // JWT is stateless - client discards token
    // In production: invalidate refresh token in DB
    return { message: 'Logged out successfully' };
  }
}
