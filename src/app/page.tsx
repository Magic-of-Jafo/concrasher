import ConventionFeed from "@/components/features/ConventionFeed";
import { headers } from "next/headers";

// Helper component for buttons to ensure they are client components if using client-side JS
// However, for <form action={...}> with server actions, this is not strictly needed
// if signIn/signOut from 'next-auth' (server-side) are used directly in server actions.
// Let's assume direct server actions for now, so we need server-side compatible signIn/signOut
// For v4, top-level `next-auth` signIn/signOut can be used for redirects.

async function fetchConventions() {
  const headersList = headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const res = await fetch(`${baseUrl}/api/conventions`, { cache: "no-store" });
  if (!res.ok) return { items: [] };
  return res.json();
}

export default async function Home() {
  const { items: conventions } = await fetchConventions();
  return <ConventionFeed conventions={conventions} />;
}
