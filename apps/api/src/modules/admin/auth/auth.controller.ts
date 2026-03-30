import { Body, Controller, Get, Post } from "@nestjs/common";

interface LoginRequest {
  email: string;
  password: string;
}

@Controller("admin/auth")
export class AdminAuthController {
  @Post("login")
  login(@Body() body: LoginRequest) {
    return {
      ok: true,
      token: "scaffold-admin-token",
      admin: {
        id: "admin_1",
        email: body.email,
        role: "owner"
      }
    };
  }

  @Get("me")
  me() {
    return {
      ok: true,
      admin: {
        id: "admin_1",
        email: "admin@runacademy.online",
        role: "owner"
      }
    };
  }
}
