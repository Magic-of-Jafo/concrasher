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
        console.log('[Authorize] Attempting to authorize with credentials:', credentials?.email);
        const validatedCredentials = LoginSchema.safeParse(credentials);

        if (!validatedCredentials.success) {
          console.log('[Authorize] Credential validation failed.');
          return null;
        }

        const { email, password } = validatedCredentials.data;

        try {
          const user = await db.user.findUnique({
            where: { email },
          });
          console.log('[Authorize] User found in DB:', user ? user.id : 'No user found');

          if (!user || !user.hashedPassword) {
            console.log('[Authorize] User not found or no password set.');
            return null;
          }

          const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
          console.log('[Authorize] Password valid:', isValidPassword);

          if (!isValidPassword) {
            return null;
          }

          const name = user.stageName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
          console.log('[Authorize] Constructed name:', name);

          const authorizedUser = {
            id: user.id,
            name: name,
            email: user.email,
            roles: user.roles,
          };
          console.log('[Authorize] Returning authorized user:', authorizedUser);
          return authorizedUser;
        } catch (error) {
          console.error('[Authorize] Error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as Role[];
        session.user.image = token.picture as string | null | undefined;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      console.log('--- [JWT Callback] Start ---');
      console.log('[JWT] Trigger:', trigger);
      console.log('[JWT] Initial Token:', token);
      console.log('[JWT] User object from authorize:', user);

      // The token's 'id' is the single source of truth for the user's identity
      if (user) {
        token.id = user.id;
        console.log('[JWT] User object present. Set token.id to:', token.id);
      }

      if (!token.id) {
        console.log('[JWT] No token.id found. Returning token as is.');
        console.log('--- [JWT Callback] End ---');
        return token;
      }

      console.log('[JWT] Fetching user from DB with token.id:', token.id);
      // If the session was updated (e.g. by calling update()), 
      // or on initial sign-in, we need to refetch from the DB to get the latest data.
      const dbUser = await db.user.findUnique({
        where: { id: token.id as string },
        select: { image: true, roles: true, firstName: true, lastName: true, stageName: true }
      });
      console.log('[JWT] DB user fetched:', dbUser);


      if (!dbUser) {
        // User has been deleted from DB, invalidate the token
        token.id = undefined;
        console.log('[JWT] DB user not found. Invalidating token.');
        console.log('--- [JWT Callback] End ---');
        return token;
      }

      const name = dbUser.stageName || `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim();
      token.name = name;
      token.picture = dbUser.image;
      token.roles = dbUser.roles;

      console.log('[JWT] Final token before returning:', token);
      console.log('--- [JWT Callback] End ---');
      return token;
    },
  },
};

// No NextAuth() call or destructuring here for v4 in this file.
// This file just exports options.
