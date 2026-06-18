import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://dutmgacdzuptufvufjpg.supabase.co";

const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dG1nYWNkenVwdHVmdnVmanBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjAxNDIsImV4cCI6MjA5NTI5NjE0Mn0.BIc7_r647obkaBDeIOAWoOXlcp0SynfQrwY9rq0_r7s";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);