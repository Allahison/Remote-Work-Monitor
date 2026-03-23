import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = fs.readFileSync(join(__dirname, '.env'), 'utf8');
const envLines = envFile.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envLines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching admin profile...");
  const { data: admins, error: adminErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1);

  if (adminErr || !admins || admins.length === 0) {
    console.error("Could not find an admin user:", adminErr);
    process.exit(1);
  }

  const adminId = admins[0].id;
  console.log(`Found Admin ID: ${adminId}`);

  console.log("Updating all tasks with null created_by to point to this admin...");
  const { data, error } = await supabase
    .from('tasks')
    .update({ created_by: adminId })
    .is('created_by', null)
    .select();

  if (error) {
    console.error("Failed to update tasks:", error);
    process.exit(1);
  }

  console.log(`Successfully updated ${data?.length || 0} older tasks to show the admin's avatar!`);
}

main();
