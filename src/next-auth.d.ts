import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";
import { Role } from "@prisma/client";

declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's id. */
      id: string;
      /** The user's roles. */
      roles?: Role[];
      /** The user's talent profile. */
      talentProfile?: { id: string; isActive: boolean } | null;
    } & DefaultSession["user"]; // Keep existing DefaultSession user properties
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends DefaultUser {
    /** The user's roles. */
    roles?: Role[];
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    /** The user's id. */
    id?: string;
    /** The user's roles. */
    roles?: Role[];
    /** The user's talent profile. */
    talentProfile?: { id: string; isActive: boolean } | null;
  }
} 