import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import type { JwtPayload } from './auth.service';
import { authRateLimitOk } from './auth-rate-limit';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(2)
  organizationName!: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Sign in and receive JWT' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    this.assertAuthRateLimit(req, dto.email);
    return this.authService.login(dto.email, dto.password, dto.tenantId);
  }

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Create organization and admin user' })
  signup(@Body() dto: SignupDto, @Req() req: Request) {
    this.assertAuthRateLimit(req, dto.email);
    return this.authService.signup(dto.email, dto.password, dto.name, dto.organizationName);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset link' })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    this.assertAuthRateLimit(req, dto.email);
    return this.authService.requestPasswordReset(dto.email, dto.tenantId);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    this.assertAuthRateLimit(req, dto.token.slice(0, 16));
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user with roles/permissions' })
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user);
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token (sliding expiry)' })
  refresh(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    return this.authService.refreshToken(authHeader.slice(7));
  }

  private assertAuthRateLimit(req: Request, email: string) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const key = `${ip}:${email.toLowerCase()}`;
    if (!authRateLimitOk(key)) {
      throw new UnauthorizedException('Too many auth attempts. Try again later.');
    }
  }
}
