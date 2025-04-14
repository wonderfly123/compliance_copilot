// server/config/supabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create real Supabase client with your credentials
const supabaseUrl = 'https://ehazvybmhkfrmoyukiqy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoYXp2eWJtaGtmcm1veXVraXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NzAzOTAsImV4cCI6MjA1OTM0NjM5MH0.WEA_iFoFXdql8fYaXtd8bFw8kn_8IeyiRYMQQ8Q0DY0'

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

console.log('Supabase client initialized with public anon key');

module.exports = supabase;