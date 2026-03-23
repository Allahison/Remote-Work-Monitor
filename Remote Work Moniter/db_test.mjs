import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envStr = fs.readFileSync('.env', 'utf-8')
const envAuth = {}
envStr.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, val] = line.split('=')
    envAuth[key.trim()] = val.trim()
  }
})

const supabase = createClient(envAuth.VITE_SUPABASE_URL, envAuth.VITE_SUPABASE_ANON_KEY)

async function test() {
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('id, created_at, conversation_participants(user_id)')
    .eq('type', 'dm')
    
  if (error) {
    console.error('Error fetching convs:', error)
    return
  }
  
  console.log('Conversations:', JSON.stringify(convs, null, 2))
}

test()
