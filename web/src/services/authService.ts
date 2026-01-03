import { supabase } from "@/lib/supabaseClient";

export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: "http://localhost:5173" },
  });
  if (error) throw error;
}

export async function requestOtpCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyOtpCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "magiclink",
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthStateChange(cb: () => void) {
  const { data } = supabase.auth.onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
