import NextAuth, { AuthOptions, Session, User as NextAuthUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { LoginSchema } from '@/lib/validators';

// Define your NextAuth configuration for v4
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' }, // Reverted to 'jwt' for CredentialsProvider compatibility
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
        // Validate input using Zod schema
        const validatedCredentials = LoginSchema.safeParse(credentials);

        if (!validatedCredentials.success) {
          console.error("Validation failed:", validatedCredentials.error.flatten().fieldErrors);
          return null; // Or throw an error Auth.js can catch
        }

        const { email, password } = validatedCredentials.data;

        try {
          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user || !user.hashedPassword) {
            // User not found or user doesn't have a password (e.g. OAuth user)
            return null;
          }

          const isValidPassword = await bcrypt.compare(password, user.hashedPassword);

          if (!isValidPassword) {
            return null;
          }

          // Return user object that Auth.js expects
          return {
            id: user.id,
            name: user.name, // Assuming you have a name field, or adjust as needed
            email: user.email,
            // image: user.image, // If you have an image field
          };
        } catch (error) {
          console.error("Error in authorize function:", error);
          return null; // Or throw an error
        }
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
