import NextAuth, { AuthOptions, Session, User as NextAuthUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';

// Define your NextAuth configuration for v4
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' }, // In v4, with adapter, this is often 'database', but 'jwt' is also possible.
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (credentials?.email === 'user@example.com' && credentials?.password === 'password') {
          return { id: '1', name: 'Test User', email: 'user@example.com' }; // image can be omitted
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser }) {
      if (user && user.id) {
        token.id = user.id;
      }
      return token;
    },
  },
  // pages: { signIn: '/auth/signin' }, // Optional
  // debug: process.env.NODE_ENV === 'development',
};

// No NextAuth() call or destructuring here for v4 in this file.
// This file just exports options.
