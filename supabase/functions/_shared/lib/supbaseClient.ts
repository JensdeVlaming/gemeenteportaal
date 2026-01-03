import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../database.types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey
);

export default supabaseClient;
