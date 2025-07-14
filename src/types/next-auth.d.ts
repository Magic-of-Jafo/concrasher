import { Role } from '@prisma/client';
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      roles: Role[];
      isBrandCreator?: boolean;
      hasTalentProfile?: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    roles: Role[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    roles: Role[];
    isBrandCreator?: boolean;
    hasTalentProfile?: boolean;
  }
} 