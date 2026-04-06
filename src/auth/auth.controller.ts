import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService, TokenResponse } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SetupDto } from './dto/setup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestWithUser } from './interfaces/request-with-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==========================================
  // INITIAL SETUP
  // ==========================================

  @Public()
  @Post('setup')
  @ApiOperation({
    summary: 'Create initial admin user',
    description: 'This endpoint creates the first admin user. Can only be used when no users exist.',
  })
  @ApiBody({ type: SetupDto })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 409, description: 'Users already exist' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async setup(@Body() setupDto: SetupDto): Promise<{ message: string; userId: string }> {
    const user = await this.authService.createInitialAdmin(
      setupDto.email,
      setupDto.password,
    );

    return {
      message: 'Initial admin user created successfully',
      userId: user.id,
    };
  }

  // ==========================================
  // LOGIN / LOGOUT
  // ==========================================

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description: 'Authenticate and receive access token and refresh token',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: Object })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Request() req: RequestWithUser,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<TokenResponse> {
    return this.authService.login(req.user, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Use refresh token to get a new access token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponse> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Revoke refresh token to logout',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ message: string }> {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: 'Logout successful' };
  }

  // ==========================================
  // CURRENT USER
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the currently authenticated user information',
  })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  getProfile(@Request() req: RequestWithUser) {
    return {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      createdAt: req.user.createdAt,
      lastLoginAt: req.user.lastLoginAt,
    };
  }

  // ==========================================
  // PASSWORD MANAGEMENT
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password',
    description: 'Change the current user password',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @Request() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // Implementation would go here
    // For now, return a placeholder
    return { message: 'Password change endpoint - implement in service' };
  }
}
