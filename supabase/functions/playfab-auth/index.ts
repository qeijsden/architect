import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlayFabLoginResult {
  data?: {
    SessionTicket: string;
    PlayFabId: string;
    NewlyCreated?: boolean;
  };
  error?: {
    errorMessage: string;
    errorCode: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, email, password, displayName } = await req.json();
    
    const titleId = Deno.env.get('PLAYFAB_TITLE_ID');
    const secretKey = Deno.env.get('PLAYFAB_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!titleId || !secretKey) {
      throw new Error('PlayFab credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const playfabBaseUrl = `https://${titleId}.playfabapi.com`;

    if (action === 'register') {
      // Register with PlayFab
      const registerResponse = await fetch(`${playfabBaseUrl}/Client/RegisterPlayFabUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TitleId: titleId,
          Email: email,
          Password: password,
          Username: displayName,
          DisplayName: displayName,
        }),
      });

      const registerResult: PlayFabLoginResult = await registerResponse.json();

      if (registerResult.error) {
        throw new Error(registerResult.error.errorMessage);
      }

      // Create Supabase user with custom token
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          playfab_id: registerResult.data!.PlayFabId,
          display_name: displayName,
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      // Create profile
      await supabase.from('profiles').insert({
        user_id: authData.user.id,
        playfab_id: registerResult.data!.PlayFabId,
        display_name: displayName,
      });

      // Generate session for user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      // Sign in the user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: signInData.user,
          session: signInData.session,
          playfabId: registerResult.data!.PlayFabId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'login') {
      // Login with PlayFab
      const loginResponse = await fetch(`${playfabBaseUrl}/Client/LoginWithEmailAddress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TitleId: titleId,
          Email: email,
          Password: password,
        }),
      });

      const loginResult: PlayFabLoginResult = await loginResponse.json();

      if (loginResult.error) {
        throw new Error(loginResult.error.errorMessage);
      }

      // Sign in with Supabase
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // User might exist in PlayFab but not Supabase, create them
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            playfab_id: loginResult.data!.PlayFabId,
          },
        });

        if (authError) {
          throw new Error(signInError.message);
        }

        // Try to get display name from PlayFab
        const profileResponse = await fetch(`${playfabBaseUrl}/Server/GetPlayerProfile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SecretKey': secretKey,
          },
          body: JSON.stringify({
            PlayFabId: loginResult.data!.PlayFabId,
          }),
        });

        const profileResult = await profileResponse.json();
        const pfDisplayName = profileResult?.data?.PlayerProfile?.DisplayName || email.split('@')[0];

        // Create profile
        await supabase.from('profiles').insert({
          user_id: authData.user.id,
          playfab_id: loginResult.data!.PlayFabId,
          display_name: pfDisplayName,
        });

        // Sign in
        const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (newSignInError) {
          throw new Error(newSignInError.message);
        }

        return new Response(
          JSON.stringify({
            success: true,
            user: newSignIn.user,
            session: newSignIn.session,
            playfabId: loginResult.data!.PlayFabId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: signInData.user,
          session: signInData.session,
          playfabId: loginResult.data!.PlayFabId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('PlayFab auth error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
