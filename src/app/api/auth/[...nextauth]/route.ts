import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Assuming authOptions is in src/lib/auth.ts

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
// export const runtime = "edge"; // Optional, for Vercel Edge Functions 