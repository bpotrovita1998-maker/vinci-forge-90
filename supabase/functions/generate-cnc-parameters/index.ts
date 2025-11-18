import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { material, toolDiameter = 6, modelDimensions } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating CNC parameters for material:', material);

    const systemPrompt = `You are a CNC machining expert. Generate precise machining parameters for the given material.
Return your response as a JSON object with this exact structure:
{
  "spindleSpeed": number (in RPM),
  "feedRate": number (in mm/min),
  "plungeRate": number (in mm/min),
  "depthOfCut": number (in mm),
  "stepover": number (as percentage, e.g., 40 for 40%),
  "coolant": string ("flood", "mist", "air", or "none"),
  "notes": string (brief machining tips)
}`;

    const userPrompt = `Generate CNC machining parameters for:
Material: ${material}
Tool diameter: ${toolDiameter}mm
${modelDimensions ? `Model dimensions: ${JSON.stringify(modelDimensions)}` : ''}

Consider standard 3-axis CNC milling operations. Optimize for good surface finish while maintaining reasonable material removal rates.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_cnc_parameters",
            description: "Generate CNC machining parameters for the specified material",
            parameters: {
              type: "object",
              properties: {
                spindleSpeed: {
                  type: "number",
                  description: "Spindle speed in RPM"
                },
                feedRate: {
                  type: "number",
                  description: "Feed rate in mm/min"
                },
                plungeRate: {
                  type: "number",
                  description: "Plunge rate in mm/min"
                },
                depthOfCut: {
                  type: "number",
                  description: "Depth of cut in mm"
                },
                stepover: {
                  type: "number",
                  description: "Stepover percentage (e.g., 40 for 40%)"
                },
                coolant: {
                  type: "string",
                  enum: ["flood", "mist", "air", "none"],
                  description: "Coolant type"
                },
                notes: {
                  type: "string",
                  description: "Brief machining tips and notes"
                }
              },
              required: ["spindleSpeed", "feedRate", "plungeRate", "depthOfCut", "stepover", "coolant", "notes"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_cnc_parameters" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    // Extract parameters from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No tool call in AI response');
    }

    const parameters = JSON.parse(toolCall.function.arguments);
    
    console.log('Generated parameters:', parameters);

    return new Response(
      JSON.stringify({ parameters }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating CNC parameters:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to generate CNC parameters'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
