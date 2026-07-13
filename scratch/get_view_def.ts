
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function getViewDefinition() {
  const { data, error } = await supabase.rpc('get_view_definition', { view_name: 'unified_transactions' });
  if (error) {
    // Fallback: try querying pg_views
    const { data: data2, error: error2 } = await supabase.from('pg_views').select('definition').eq('viewname', 'unified_transactions').single();
    if (error2) {
      console.error('Error fetching view definition:', error2);
      return;
    }
    console.log('View Definition:', data2.definition);
  } else {
    console.log('View Definition:', data);
  }
}

getViewDefinition();
