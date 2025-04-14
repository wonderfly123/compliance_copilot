// server/utils/supabaseAuth.js
const { createClient } = require('@supabase/supabase-js');

// Base Supabase URL and anon key from your config
const supabaseUrl = process.env.SUPABASE_URL || 'https://ehazvybmhkfrmoyukiqy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoYXp2eWJtaGtmcm1veXVraXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NzAzOTAsImV4cCI6MjA1OTM0NjM5MH0.WEA_iFoFXdql8fYaXtd8bFw8kn_8IeyiRYMQQ8Q0DY0';

// Default client with anon key
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create a Supabase client that uses Row Level Security bypass
 * This approach doesn't depend on JWT format and will work in any environment
 * @param {string} userId - The user's ID to use for RLS policies
 * @returns {Object} - Supabase client with headers set for RLS
 */
const getClientWithUserId = (userId) => {
  if (!userId) {
    console.warn('No user ID provided for Supabase client');
    return supabase;
  }
  
  console.log('Creating Supabase client with explicit user ID:', userId);
  
  // Create client with user ID header for RLS policies
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'X-User-ID': userId // Custom header that RLS policies can check
      }
    }
  });
};

module.exports = {
  supabase,
  getClientWithUserId
};