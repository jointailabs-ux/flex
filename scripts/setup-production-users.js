import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://heecsjhktcevmzzhrycy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  console.log('Initializing Stores and Users...');

  // 1. Create Stores
  const stores = [
    { name: 'Mumbai Terminal A', code: 'MU-A', location: 'Andheri' },
    { name: 'Delhi Hub', code: 'DE-B', location: 'Okhla' },
    { name: 'Kolkata Outlet', code: 'KO-C', location: 'Salt Lake' }
  ];

  const { data: storeData, error: storeError } = await supabase.from('stores').upsert(stores, { onConflict: 'code' }).select();
  if (storeError) {
    console.error('Error creating stores:', storeError);
    return;
  }
  console.log('Stores initialized.');

  const storeMap = storeData.reduce((acc, s) => ({ ...acc, [s.code]: s.id }), {});

  // 2. Define Users
  const users = [
    { name: 'System Admin', email: 'admin@flexstock.com', role: 'owner', pin: '123456', password: 'adminpassword' },
    { name: 'Store A Manager', email: 'managerA@flexstock.com', role: 'store_manager', store_code: 'MU-A', pin: '111111', password: 'managerpassword' },
    { name: 'Store B Manager', email: 'managerB@flexstock.com', role: 'store_manager', store_code: 'DE-B', pin: '222222', password: 'managerpassword' },
    { name: 'Store C Manager', email: 'managerC@flexstock.com', role: 'store_manager', store_code: 'KO-C', pin: '333333', password: 'managerpassword' }
  ];

  for (const u of users) {
    console.log(`Setting up user: ${u.email}...`);
    
    // Create Auth User
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`User ${u.email} already exists in Auth.`);
        // Get existing user id
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(eu => eu.email === u.email);
        if (existingUser) {
           await supabase.from('users').upsert({
             id: existingUser.id,
             email: u.email,
             name: u.name,
             role: u.role,
             store_id: u.store_code ? storeMap[u.store_code] : null,
             pin: u.pin
           });
           console.log(`Profile updated for ${u.email}`);
        }
      } else {
        console.error(`Error creating auth user ${u.email}:`, authError);
      }
      continue;
    }

    // Create Profile
    const { error: profileError } = await supabase.from('users').upsert({
      id: authUser.user.id,
      email: u.email,
      name: u.name,
      role: u.role,
      store_id: u.store_code ? storeMap[u.store_code] : null,
      pin: u.pin
    });

    if (profileError) {
      console.error(`Error creating profile for ${u.email}:`, profileError);
    } else {
      console.log(`User ${u.email} set up successfully with PIN ${u.pin}`);
    }
  }

  console.log('Setup complete!');
}

setup();
