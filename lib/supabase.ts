import { createClient } from "@supabase/supabase-js";
export function browserDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key) : null;
}
// Keep the customer's anonymous session separate from the administrator's login.
let customer: ReturnType<typeof createClient> | null = null;
export function customerDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  customer ??= createClient(url, key, {
    auth: { storageKey: "mi-customer-session", persistSession: true },
  });
  return customer;
}
