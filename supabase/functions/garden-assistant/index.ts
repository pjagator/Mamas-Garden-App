Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    if (!action || !data) throw new Error("Missing action or data");

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("Anthropic API key not configured");

    let result;

    if (action === "care_profile") {
      result = await generateCareProfile(data, anthropicKey);
    } else {
      throw new Error("Unknown action: " + action);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
});

async function generateCareProfile(
  data: { common: string; scientific: string; type: string; category: string },
  anthropicKey: string
) {
  const { common, scientific, type, category } = data;

  if (type !== "plant") {
    return { care_profile: null, message: "Care profiles are for plants only" };
  }

  const prompt = `You are a Tampa Bay, Florida (USDA Zone 9b/10a) gardening expert. Generate a detailed care profile for the following plant:

Common name: ${common}
Scientific name: ${scientific || "unknown"}
Category: ${category || "unknown"}

Return a JSON object with exactly these fields:
{
  "watering": {
    "frequency": "How often to water in Tampa Bay (e.g. '2-3 times per week in summer, once per week in winter')",
    "notes": "Any special watering considerations for this area"
  },
  "sun": "Full sun / Partial shade / Full shade / etc.",
  "soil": "Soil type preferences (e.g. 'Well-drained sandy soil')",
  "fertilizing": {
    "schedule": "When and how often to fertilize in Tampa Bay",
    "type": "Recommended fertilizer type"
  },
  "pruning": {
    "timing": "Best time of year to prune in Tampa Bay",
    "method": "How to prune this plant"
  },
  "pests": ["List of common pests/diseases in central Florida for this plant"],
  "companions": ["List of 3-5 companion plants that grow well alongside this in Tampa Bay gardens"],
  "mature_size": {
    "height": "Expected mature height (e.g. '4-6 feet')",
    "spread": "Expected mature spread (e.g. '3-4 feet')"
  }
}

Be specific to Tampa Bay's subtropical climate, sandy soil, summer rains, and humidity. Return ONLY the JSON object, no other text.`;

  const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!claudeResponse.ok) {
    const errText = await claudeResponse.text();
    throw new Error("Claude API error: " + errText);
  }

  const claudeResult = await claudeResponse.json();
  const text = claudeResult.content[0].text.trim();
  const clean = text.replace(/```json|```/g, "").trim();
  const careProfile = JSON.parse(clean);

  return { care_profile: careProfile };
}
