import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
  console.log('--- Starting Stock Conversion to SQFT ---');

  // 1. Fetch all raw materials of kind flex or vinyl
  const { data: materials, error: fetchError } = await supabase
    .from('raw_materials')
    .select('*')
    .in('material_kind', ['flex', 'vinyl']);

  if (fetchError) {
    console.error('Error fetching materials:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${materials.length} flex/vinyl raw materials to convert.`);

  for (const material of materials) {
    const width = parseFloat(material.roll_width_ft || 4);
    const conversionFactor = width * 3.28084;
    console.log(`\nProcessing material: "${material.name}" (Kind: ${material.material_kind}, Width: ${width}ft, current unit: ${material.unit})`);

    // Only convert if the unit is still MT (or not SQFT)
    if (material.unit !== 'SQFT') {
      // Update unit to SQFT in public.raw_materials
      const { error: updateMatError } = await supabase
        .from('raw_materials')
        .update({ unit: 'SQFT' })
        .eq('id', material.id);

      if (updateMatError) {
        console.error(`Error updating material unit for "${material.name}":`, updateMatError);
        continue;
      }
      console.log(`Updated material unit in raw_materials table to 'SQFT'.`);

      // Update central_stock quantities
      const { data: centralStock, error: centralFetchError } = await supabase
        .from('central_stock')
        .select('*')
        .eq('raw_material_id', material.id);

      if (centralFetchError) {
        console.error('Error fetching central stock:', centralFetchError);
      } else if (centralStock) {
        for (const stock of centralStock) {
          const originalQty = parseFloat(stock.quantity || 0);
          const newQty = originalQty * conversionFactor;
          const { error: centralUpdateError } = await supabase
            .from('central_stock')
            .update({ quantity: parseFloat(newQty.toFixed(2)), last_updated: new Date().toISOString() })
            .eq('id', stock.id);

          if (centralUpdateError) {
            console.error(`Error updating central stock for "${material.name}":`, centralUpdateError);
          } else {
            console.log(`Converted central_stock from ${originalQty} MT to ${newQty.toFixed(2)} SQFT.`);
          }
        }
      }

      // Update store_stock quantities
      const { data: storeStock, error: storeFetchError } = await supabase
        .from('store_stock')
        .select('*')
        .eq('raw_material_id', material.id);

      if (storeFetchError) {
        console.error('Error fetching store stock:', storeFetchError);
      } else if (storeStock) {
        for (const stock of storeStock) {
          const originalQty = parseFloat(stock.quantity || 0);
          const newQty = originalQty * conversionFactor;
          const { error: storeUpdateError } = await supabase
            .from('store_stock')
            .update({ quantity: parseFloat(newQty.toFixed(2)), last_updated: new Date().toISOString() })
            .eq('id', stock.id);

          if (storeUpdateError) {
            console.error(`Error updating store stock for "${material.name}":`, storeUpdateError);
          } else {
            console.log(`Converted store_stock from ${originalQty} MT to ${newQty.toFixed(2)} SQFT.`);
          }
        }
      }
    } else {
      console.log(`Material "${material.name}" is already SQFT. Skipping stock scaling.`);
    }
  }

  console.log('\n--- Migration Completed Successfully ---');
}

migrate().catch(console.error);
