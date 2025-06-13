import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get the request body
    const { log_id } = await req.json();

    if (!log_id) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing log_id parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the Supabase environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Supabase environment variables are not configured properly" 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // First, check if the import log exists and is in pending status
    const { data: existingLog, error: fetchError } = await supabaseClient
      .from('import_logs')
      .select('id, status')
      .eq('id', log_id)
      .single();

    if (fetchError) {
      console.error("Error fetching import log:", fetchError);
      return new Response(
        JSON.stringify({ success: false, message: "Import log not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (existingLog.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Cannot cancel import with status: ${existingLog.status}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update the import log status to 'cancelled'
    const { error: updateError } = await supabaseClient
      .from('import_logs')
      .update({ 
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        error_message: 'Importation annulée par l\'utilisateur'
      })
      .eq('id', log_id);

    if (updateError) {
      console.error("Error updating import log:", updateError);
      return new Response(
        JSON.stringify({ success: false, message: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Successfully cancelled import log: ${log_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Import cancellation successful" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in cancel-product-import function:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});