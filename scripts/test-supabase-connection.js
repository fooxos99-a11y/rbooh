import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    const { data, error } = await supabase.from('achievements').select('*').limit(1)
    if (error) {
      console.error('Supabase error:', error)
    } else {
      console.log('Supabase connection successful! Sample data:', data)
    }
  } catch (err) {
    console.error('Connection failed:', err)
  }
}

testConnection()
