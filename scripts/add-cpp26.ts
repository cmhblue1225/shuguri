import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Try multiple paths for env file
dotenv.config({ path: '.env' })
dotenv.config({ path: 'apps/api/.env' })

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    console.log('SUPABASE_URL:', supabaseUrl ? 'set' : 'not set')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'not set')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('cpp_versions')
    .upsert({
      id: 'cpp26',
      name: 'C++26',
      year: 2026,
      standard_doc: 'ISO/IEC 14882:2026 (Draft)',
      features: ['Contracts', 'Reflection', 'std::execution', 'Hazard pointers', 'RCU', 'Pack indexing', 'Text encoding']
    })

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  } else {
    console.log('Successfully added cpp26 to database')
  }
}

main()
