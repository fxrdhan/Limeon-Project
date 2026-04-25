export const requireAuthenticatedUser = async (req, supabase, corsHeaders) => {
  const authorizationHeader = req.headers.get("Authorization");
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return {
      response: new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }),
    };
  }

  const accessToken = authorizationHeader.replace(/^Bearer\s+/i, "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user?.id) {
    return {
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }),
    };
  }

  return { user };
};
