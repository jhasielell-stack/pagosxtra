import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_EMAIL = "auxcontable@colectivotomate.com";
const ADMIN_PASSWORD = "TomateAdmin2026!";
const ADMIN_USER_ID = "a0000000-0000-0000-0000-000000000001";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, password, action } = body;

    if (!email) {
      return json({ error: "Email es requerido" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── SIGN UP ──────────────────────────────────────────────
    if (action === "signup") {
      const { fullName, area, jobTitle } = body;

      if (!password || password.length < 6) {
        return json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);
      }

      if (normalizedEmail === ADMIN_EMAIL) {
        return json({ error: "Este correo está reservado. Usa uno diferente." }, 400);
      }

      // Create the user in Supabase Auth with the user-chosen password
      const { data: signUpData, error: signUpError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName || "Nuevo Usuario" },
      });

      if (signUpError) {
        return json({ error: `No se pudo crear el usuario: ${signUpError.message}` }, 500);
      }

      // Create the profile
      const { error: profileError } = await adminClient.from("profiles").upsert({
        id: signUpData.user!.id,
        email: normalizedEmail,
        full_name: fullName || "Nuevo Usuario",
        role: "solicitante",
        area: area || "Asistencia",
        job_title: jobTitle || "",
      });

      if (profileError) {
        return json({ error: `No se pudo crear el perfil: ${profileError.message}` }, 500);
      }

      // Sign in the newly created user
      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (signInError) {
        return json({
          profile: {
            id: signUpData.user!.id,
            email: normalizedEmail,
            full_name: fullName || "Nuevo Usuario",
            role: "solicitante",
            area: area || "Asistencia",
            job_title: jobTitle || "",
          },
          needManualLogin: true,
        });
      }

      const { data: profileData } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", signUpData.user!.id)
        .maybeSingle();

      return json({
        access_token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
        expires_at: signInData.session?.expires_at,
        profile: profileData,
      });
    }

    // ── SIGN IN ──────────────────────────────────────────────
    if (!password) {
      return json({ error: "Contraseña es requerida" }, 400);
    }

    // For admin: ensure the password is correct, then reset it if needed and sign in
    if (normalizedEmail === ADMIN_EMAIL) {
      if (password !== ADMIN_PASSWORD) {
        return json({ error: "Credenciales inválidas" }, 401);
      }

      // Ensure admin password is set (reset in case it was changed)
      const { error: resetError } = await adminClient.auth.admin.updateUserById(
        ADMIN_USER_ID,
        { password: ADMIN_PASSWORD, email_confirm: true },
      );

      if (resetError) {
        // The admin user might not exist — try creating it
        const { error: createError } = await adminClient.auth.admin.createUser({
          id: ADMIN_USER_ID,
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: "Carlos Administrador" },
        });

        if (createError) {
          // Last resort: try signing in directly anyway
        }
      }

      // Ensure admin profile exists and has correct data
      const { data: adminProfile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", ADMIN_USER_ID)
        .maybeSingle();

      if (!adminProfile) {
        const { data: newAdminProfile } = await adminClient.from("profiles").upsert({
          id: ADMIN_USER_ID,
          email: ADMIN_EMAIL,
          full_name: "Carlos Administrador",
          role: "administrador",
          area: "Dirección",
          job_title: "Administrador Propietario",
        }).select("*").maybeSingle();

        // Now sign in
        const { data: adminSession, error: adminSessionError } = await anonClient.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });

        if (adminSessionError) {
          return json({ error: `Error de autenticación: ${adminSessionError.message}` }, 500);
        }

        return json({
          access_token: adminSession.session?.access_token,
          refresh_token: adminSession.session?.refresh_token,
          expires_at: adminSession.session?.expires_at,
          profile: newAdminProfile,
        });
      }

      // Sign in admin
      const { data: adminSession, error: adminSessionError } = await anonClient.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      if (adminSessionError) {
        return json({ error: `Error de autenticación: ${adminSessionError.message}` }, 500);
      }

      return json({
        access_token: adminSession.session?.access_token,
        refresh_token: adminSession.session?.refresh_token,
        expires_at: adminSession.session?.expires_at,
        profile: adminProfile,
      });
    }

    // Regular user: sign in directly with Supabase Auth
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });

    if (signInError) {
      return json({ error: "Credenciales inválidas. Si eres nuevo, regístrate primero." }, 401);
    }

    // Fetch or create the user's profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", signInData.user!.id)
      .maybeSingle();

    if (profileError || !profile) {
      const { data: newProfile } = await adminClient.from("profiles").upsert({
        id: signInData.user!.id,
        email: normalizedEmail,
        full_name: signInData.user!.user_metadata?.full_name || "Nuevo Usuario",
        role: "solicitante",
        area: "Asistencia",
        job_title: "",
      }).select("*").maybeSingle();

      return json({
        access_token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
        expires_at: signInData.session?.expires_at,
        profile: newProfile,
      });
    }

    return json({
      access_token: signInData.session?.access_token,
      refresh_token: signInData.session?.refresh_token,
      expires_at: signInData.session?.expires_at,
      profile,
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }

  function json(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
