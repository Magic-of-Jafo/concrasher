import NextAuth, { AuthOptions, Session, User as NextAuthUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { LoginSchema } from '@/lib/validators';
import { Role } from '@prisma/client';

// Define your NextAuth configuration for v4
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validatedCredentials = LoginSchema.safeParse(credentials);

        if (!validatedCredentials.success) {
          return null;
        }

        const { email, password } = validatedCredentials.data;

        try {
          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user || !user.hashedPassword) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(password, user.hashedPassword);

          if (!isValidPassword) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles,
          };
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.roles) {
        session.user.id = token.id;
        session.user.roles = token.roles;
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser & { roles?: Role[] } }) {
      if (user) {
        token.id = user.id;
        // This is the crucial change: we check for `undefined` instead of truthiness.
        // An empty array `[]` is a valid value for roles.
        if (user.roles !== undefined) {
          token.roles = user.roles;
        } else {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { roles: true },
          });
          if (dbUser) {
            token.roles = dbUser.roles;
          }
        }
      }
      return token;
    },
  },
};

// No NextAuth() call or destructuring here for v4 in this file.
// This file just exports options.
