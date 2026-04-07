import { Body, Controller, Post } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body?.username, body?.password);
  }

  @Public()
  @Post('register')
  register(
    @Body() body: { username: string; password: string; role?: string },
  ) {
    return this.authService.register(body);
  }
}
