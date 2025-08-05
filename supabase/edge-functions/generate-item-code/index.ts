import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  type_id: string;
  unit_id: string;
  category_id: string;
  exclude_item_id?: string; // For edit mode
}

interface ResponseBody {
  success: boolean;
  data?: {
    code: string;
    prefix: string;
    sequence: number;
  };
  error?: string;
}

/**
 * Generates type code based on medicine type name
 */
function generateTypeCode(typeName: string): string {
  const name = typeName.toLowerCase();
  if (name.includes("bebas") && !name.includes("terbatas")) return "B";
  if (name.includes("bebas terbatas")) return "T";
  if (name.includes("keras")) return "K";
  if (name.includes("narkotika")) return "N";
  if (name.includes("fitofarmaka")) return "F";
  if (name.includes("herbal")) return "H";
  
  return typeName.charAt(0).toUpperCase();
}

/**
 * Generates unit code - first letter of unit name
 */
function generateUnitCode(unitName: string): string {
  return unitName.charAt(0).toUpperCase();
}

/**
 * Generates category code with smart "anti" prefix handling
 */
function generateCategoryCode(categoryName: string): string {
  if (categoryName.toLowerCase().startsWith("anti")) {
    const baseName = categoryName.slice(4);
    if (baseName.length > 0) {
      return "A" + baseName.charAt(0).toUpperCase();
    }
    return "A";
  }
  
  if (categoryName.length >= 2) {
    return categoryName.substring(0, 2).toUpperCase();
  } else if (categoryName.length === 1) {
    return categoryName.toUpperCase() + "X";
  }
  
  return "XX";
}

/**
 * Finds next available sequence number
 */
function findNextSequence(existingCodes: string[], prefix: string): number {
  if (!existingCodes.length) return 1;

  const usedSequences = new Set<number>();
  
  existingCodes.forEach(code => {
    const sequenceStr = code.substring(prefix.length);
    const sequenceNum = parseInt(sequenceStr);
    if (!isNaN(sequenceNum)) {
      usedSequences.add(sequenceNum);
    }
  });

  let sequence = 1;
  while (usedSequences.has(sequence)) {
    sequence++;
  }

  return sequence;
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const body: RequestBody = await req.json();
    const { type_id, unit_id, category_id, exclude_item_id } = body;

    // Validate required fields
    if (!type_id || !unit_id || !category_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: type_id, unit_id, category_id"
        } as ResponseBody),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch type, unit, and category data
    const [typeResponse, unitResponse, categoryResponse] = await Promise.all([
      supabase.from('item_types').select('id, code, name').eq('id', type_id).single(),
      supabase.from('item_units').select('id, code, name').eq('id', unit_id).single(),
      supabase.from('item_categories').select('id, code, name').eq('id', category_id).single()
    ]);

    // Check for errors
    if (typeResponse.error) {
      throw new Error(`Type not found: ${typeResponse.error.message}`);
    }
    if (unitResponse.error) {
      throw new Error(`Unit not found: ${unitResponse.error.message}`);
    }
    if (categoryResponse.error) {
      throw new Error(`Category not found: ${categoryResponse.error.message}`);
    }

    // Use code field if available, otherwise generate from name
    const typeCode = typeResponse.data.code || generateTypeCode(typeResponse.data.name);
    const unitCode = unitResponse.data.code || generateUnitCode(unitResponse.data.name);
    const categoryCode = categoryResponse.data.code || generateCategoryCode(categoryResponse.data.name);
    const codePrefix = `${typeCode}${unitCode}${categoryCode}`;

    // Query existing codes with same prefix
    let query = supabase
      .from('items')
      .select('code')
      .ilike('code', `${codePrefix}%`)
      .order('code', { ascending: true });

    // Exclude current item if editing
    if (exclude_item_id) {
      query = query.neq('id', exclude_item_id);
    }

    const { data: existingItems, error: queryError } = await query;
    
    if (queryError) {
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    // Extract existing codes and find next sequence
    const existingCodes = existingItems?.map(item => item.code) || [];
    const sequence = findNextSequence(existingCodes, codePrefix);
    const sequenceStr = sequence.toString().padStart(2, "0");
    const finalCode = `${codePrefix}${sequenceStr}`;

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          code: finalCode,
          prefix: codePrefix,
          sequence: sequence
        }
      } as ResponseBody),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating item code:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } as ResponseBody),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});