import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const products = [
  // Flex banners
  { name: 'Flex banners', unit: 'SQFT', description: 'Standard flex banner printing' },
  { name: 'Star flex', unit: 'SQFT', description: 'Premium star flex material' },
  { name: 'Frontlit flex', unit: 'SQFT', description: 'Front-illuminated flex' },
  { name: 'Backlit flex', unit: 'SQFT', description: 'Rear-illuminated flex for glow boxes' },
  { name: 'Vinyl printing', unit: 'SQFT', description: 'High-quality vinyl sticker printing' },
  { name: 'Eco-solvent printing', unit: 'SQFT', description: 'Eco-friendly solvent printing' },
  { name: 'UV printing', unit: 'SQFT', description: 'Ultra-violet cured printing for durability' },
  
  // Sign boards
  { name: 'Glow sign boards', unit: 'PCS', description: 'Lighted glow sign boards' },
  { name: 'ACP sign boards', unit: 'SQFT', description: 'Aluminum Composite Panel boards' },
  { name: 'LED sign boards', unit: 'PCS', description: 'Programmable or static LED boards' },
  { name: 'Neon sign boards', unit: 'PCS', description: 'Traditional or LED neon signs' },
  { name: 'Shop name boards', unit: 'SQFT', description: 'Customized shop branding boards' },
  
  // Large Format
  { name: 'Hoardings', unit: 'SQFT', description: 'Large outdoor advertising hoardings' },
  { name: 'Billboards', unit: 'SQFT', description: 'High-visibility roadside billboards' },
  
  // Events
  { name: 'Event backdrops', unit: 'SQFT', description: 'Custom backdrops for events and weddings' },
  { name: 'Stage backdrop printing', unit: 'SQFT', description: 'Professional stage backgrounds' },
  { name: 'Political banners', unit: 'SQFT', description: 'Campaign and political promotion banners' },
  { name: 'Festival banners', unit: 'SQFT', description: 'Traditional and religious festival banners' },
  { name: 'Welcome gates', unit: 'PCS', description: 'Decorative entry gates for events' },
  { name: 'Roadside advertisement banners', unit: 'SQFT', description: 'Standard advertising banners' },
  
  // Promotional
  { name: 'Roll-up standees', unit: 'PCS', description: 'Portable roll-up display stands' },
  { name: 'X-banners', unit: 'PCS', description: 'Economical X-frame banner stands' },
  { name: 'Promotional standees', unit: 'PCS', description: 'Customized promotional display units' },
  
  // Specialty
  { name: 'Sunboard printing', unit: 'SQFT', description: 'Direct printing on sunboard/foam sheets' },
  { name: 'Foam board printing', unit: 'SQFT', description: 'Lightweight foam board printing' },
  { name: 'Canvas printing', unit: 'SQFT', description: 'Artistic canvas textured prints' },
  { name: 'One-way vision stickers', unit: 'SQFT', description: 'Perforated window film' },
  { name: 'Frosted glass stickers', unit: 'SQFT', description: 'Privacy frosted film for glass' },
  { name: 'Window graphics', unit: 'SQFT', description: 'Custom graphics for retail windows' },
  { name: 'Wall graphics', unit: 'SQFT', description: 'Indoor wall stickers and graphics' },
  { name: 'Wall murals', unit: 'SQFT', description: 'Large scale wall-covering prints' },
  { name: 'Floor stickers', unit: 'SQFT', description: 'Durable non-slip floor graphics' },
  { name: 'Reflective stickers', unit: 'SQFT', description: 'High-visibility reflective decals' },
  
  // Business & Office
  { name: 'Visiting cards / business cards', unit: 'SET', description: 'Professional business networking cards' },
  { name: 'Letterheads', unit: 'SET', description: 'Official company letterheads' },
  { name: 'Envelopes', unit: 'PCS', description: 'Branded company envelopes' },
  { name: 'Invoice books', unit: 'PCS', description: 'Customized billing/invoice books' },
  { name: 'Bill books', unit: 'PCS', description: 'Standard transaction bill books' },
  { name: 'Cash memo books', unit: 'PCS', description: 'Official cash receipt books' },
  { name: 'Receipt books', unit: 'PCS', description: 'General purpose receipt books' },
  { name: 'Company profile brochures', unit: 'PCS', description: 'Professional multi-page brochures' },
  { name: 'Flyers', unit: 'PCS', description: 'Single-sheet promotional flyers' },
  { name: 'Pamphlets', unit: 'PCS', description: 'Informational pamphlets' },
  { name: 'Leaflets', unit: 'PCS', description: 'Small promotional leaflets' },
  { name: 'Catalogues', unit: 'PCS', description: 'Product and service catalogues' },
  { name: 'Menus', unit: 'PCS', description: 'Restaurant and service menus' },
  { name: 'Presentation folders', unit: 'PCS', description: 'Branded folders for documents' },
  { name: 'ID cards', unit: 'PCS', description: 'Custom identification cards' },
  { name: 'Employee ID cards', unit: 'PCS', description: 'Corporate employee badges' },
  { name: 'Lanyards', unit: 'PCS', description: 'Branded neck straps for ID cards' },
  { name: 'Office branding materials', unit: 'PCS', description: 'General office stationery and branding' },
  { name: 'Rubber stamps', unit: 'PCS', description: 'Customized rubber seals' },
  { name: 'Company seals', unit: 'PCS', description: 'Official corporate wax or ink seals' },
  
  // Wedding & Invitations
  { name: 'Wedding cards', unit: 'PCS', description: 'Elegant wedding invitation cards' },
  { name: 'Reception cards', unit: 'PCS', description: 'Formal reception invitations' },
  { name: 'Birthday invitations', unit: 'PCS', description: 'Creative birthday party invites' },
  { name: 'Anniversary invitations', unit: 'PCS', description: 'Special anniversary celebration cards' },
  { name: 'Naming ceremony cards', unit: 'PCS', description: 'Traditional naming ceremony invites' },
  { name: 'Puja invitation cards', unit: 'PCS', description: 'Religious puja event invitations' },
  { name: 'Custom envelopes', unit: 'PCS', description: 'Specialty invitation envelopes' },
  { name: 'RSVP cards', unit: 'PCS', description: 'Response cards for events' }
];

async function seed() {
  console.log('Starting product seeding...');
  
  for (const product of products) {
    // Check if exists
    const { data: existing } = await supabase
      .from('finished_products')
      .select('id')
      .eq('name', product.name)
      .maybeSingle();

    if (existing) {
      console.log(`Skipping: ${product.name} (already exists)`);
      continue;
    }

    const { error } = await supabase
      .from('finished_products')
      .insert({ 
        name: product.name, 
        unit: product.unit, 
        description: product.description, 
        selling_price: 0 
      });
    
    if (error) {
      console.error(`Error seeding ${product.name}:`, error.message);
    } else {
      console.log(`Seeded: ${product.name}`);
    }
  }
  
  console.log('Seeding complete!');
}

seed();
