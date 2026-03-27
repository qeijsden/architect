import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface PlayFabTitleDataResult {
  data?: {
    Data?: Record<string, string>;
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
    const { action, levelId, seed, levelData } = await req.json();
    
    const titleId = Deno.env.get('PLAYFAB_TITLE_ID');
    const secretKey = Deno.env.get('PLAYFAB_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!titleId || !secretKey) {
      throw new Error('PlayFab credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const playfabBaseUrl = `https://${titleId}.playfabapi.com`;

    if (action === 'sync_level') {
      // Store level metadata in PlayFab Title Data for external access
      console.log('Syncing level to PlayFab:', seed);
      
      // Get the level from Supabase
      const { data: level, error: levelError } = await supabase
        .from('levels')
        .select('*')
        .eq('id', levelId)
        .single();

      if (levelError || !level) {
        throw new Error('Level not found');
      }

      // Store in PlayFab as title data (keyed by seed)
      const setDataResponse = await fetch(`${playfabBaseUrl}/Server/SetTitleData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SecretKey': secretKey,
        },
        body: JSON.stringify({
          Key: `level_${level.seed}`,
          Value: JSON.stringify({
            id: level.id,
            seed: level.seed,
            name: level.name,
            author_name: level.author_name,
            author_id: level.author_id,
            plays: level.plays,
            likes: level.likes,
            completion_count: level.completion_count,
            max_time_seconds: level.max_time_seconds,
            created_at: level.created_at,
          }),
        }),
      });

      const setDataResult = await setDataResponse.json();
      console.log('PlayFab SetTitleData result:', setDataResult);

      if (setDataResult.error) {
        throw new Error(setDataResult.error.errorMessage);
      }

      return new Response(
        JSON.stringify({ success: true, seed: level.seed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'delete_level') {
      // Delete level from both Supabase and PlayFab
      console.log('Deleting level with seed:', seed);
      
      // Get level first
      const { data: level, error: levelError } = await supabase
        .from('levels')
        .select('*')
        .eq('seed', seed)
        .single();

      if (levelError || !level) {
        throw new Error('Level not found');
      }

      // Delete from Supabase
      await supabase.from('level_likes').delete().eq('level_id', level.id);
      await supabase.from('leaderboards').delete().eq('level_id', level.id);
      await supabase.from('levels').delete().eq('id', level.id);

      // Delete from PlayFab
      const deleteResponse = await fetch(`${playfabBaseUrl}/Server/SetTitleData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SecretKey': secretKey,
        },
        body: JSON.stringify({
          Key: `level_${seed}`,
          Value: null, // Setting to null deletes the key
        }),
      });

      const deleteResult = await deleteResponse.json();
      console.log('PlayFab delete result:', deleteResult);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get_level') {
      // Get level by seed
      console.log('Getting level with seed:', seed);
      
      const { data: level, error: levelError } = await supabase
        .from('levels')
        .select('*')
        .eq('seed', seed)
        .single();

      if (levelError || !level) {
        throw new Error('Level not found');
      }

      return new Response(
        JSON.stringify({ success: true, level }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'list_levels') {
      // List all level seeds from PlayFab
      console.log('Listing all levels from PlayFab');
      
      const getDataResponse = await fetch(`${playfabBaseUrl}/Server/GetTitleData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SecretKey': secretKey,
        },
        body: JSON.stringify({}),
      });

      const getDataResult: PlayFabTitleDataResult = await getDataResponse.json();

      if (getDataResult.error) {
        throw new Error(getDataResult.error.errorMessage);
      }

      // Filter for level keys
      const levels = Object.entries(getDataResult.data?.Data || {})
        .filter(([key]) => key.startsWith('level_'))
        .map(([_, value]) => JSON.parse(value));

      return new Response(
        JSON.stringify({ success: true, levels }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('PlayFab levels error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});