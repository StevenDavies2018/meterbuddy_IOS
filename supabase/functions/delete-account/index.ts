// @ts-nocheck

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing auth header." }, 401);
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await anon.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized." }, 401);
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: storageRows, error: storageError } = await service
      .from("objects")
      .select("name")
      .eq("bucket_id", "meter-images")
      .eq("owner", user.id)
      .schema("storage");

    if (storageError) {
      return json({ error: storageError.message }, 500);
    }

    const objectNames = (storageRows ?? []).map((row) => row.name).filter(Boolean);

    if (objectNames.length > 0) {
      const { error: removeError } = await service.storage.from("meter-images").remove(objectNames);
      if (removeError) {
        return json({ error: removeError.message }, 500);
      }
    }

    const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected deletion error." }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
