import { Role } from '@prisma/client';
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user?: {
      id: string;
      roles?: Role[];
    } & DefaultSession['user'];
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