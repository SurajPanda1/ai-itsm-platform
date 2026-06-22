import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(dto);
    this.setRefreshCookie(response, session.refreshToken);
    const { refreshToken: _refreshToken, ...result } = session;
    return result;
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.refresh_token as string | undefined;
    if (!token) throw new UnauthorizedException('Refresh cookie required');
    const session = await this.auth.refresh(token);
    this.setRefreshCookie(response, session.refreshToken);
    const { refreshToken: _refreshToken, ...result } = session;
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('refresh_token', { httpOnly: true, sameSite: 'lax', path: '/api/auth' });
    return { loggedOut: true };
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie('refresh_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/api/auth', maxAge: 12 * 60 * 60 * 1000 });
  }
}
