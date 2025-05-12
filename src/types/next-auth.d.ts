import { Role } from '@prisma/client';
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      roles: Role[];
    }
  }

  interface User extends DefaultUser {
    roles?: Role[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    roles?: Role[];
    id?: string; 
  }
} 