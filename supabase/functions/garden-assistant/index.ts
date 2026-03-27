async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    // Retry on 529 (overloaded) or 500+ server errors
    if (response.status === 529 || (response.status >= 500 && attempt < maxRetries)) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      console.log(`Claude API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

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
    } else if (action === "reminders") {
      result = await generateReminders(data, anthropicKey);
    } else if (action === "diagnose") {
      result = await diagnosePlant(data, anthropicKey);
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

  const claudeResponse = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
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

async function generateReminders(
  data: { month: string; plants: Array<{ common: string; scientific: string; category: string }> },
  anthropicKey: string
) {
  const { month, plants } = data;

  if (!plants || plants.length === 0) {
    return { reminders: [] };
  }

  const plantList = plants
    .map((p) => `- ${p.common} (${p.scientific || "unknown"}, ${p.category || "unknown"})`)
    .join("\n");

  const prompt = `You are a Tampa Bay, Florida (USDA Zone 9b/10a) gardening expert. It is currently ${month}. A gardener has these plants in their garden:

${plantList}

Generate 3-5 timely, specific care reminders for this month. Each reminder should reference a specific plant from the list when applicable, or be a general garden task for Tampa Bay in ${month}. Make them friendly and encouraging — this is a garden journal, not a chore list.

Return a JSON object with exactly this structure:
{
  "reminders": [
    {
      "icon": "relevant emoji (e.g. ✂️ for pruning, 💧 for watering, 🌸 for blooming, 🐛 for pests, 🌱 for planting)",
      "title": "Short task title (under 60 chars)",
      "detail": "1-2 sentence friendly explanation of what to do and why",
      "plant": "Name of the specific plant this applies to, or 'General' for garden-wide tasks"
    }
  ]
}

Be specific to Tampa Bay's subtropical climate. Include a mix of tasks: pruning, watering adjustments, pest watch, bloom expectations, or seasonal prep. Return ONLY the JSON object, no other text.`;

  const claudeResponse = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
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
  const parsed = JSON.parse(clean);

  return { reminders: parsed.reminders || [] };
}

async function diagnosePlant(
  data: { imageUrl: string; common: string; scientific: string; health: string; notes: string },
  anthropicKey: string
) {
  const { imageUrl, common, scientific, health, notes } = data;

  if (!imageUrl) throw new Error("No image URL provided for diagnosis");

  // Fetch image and convert to base64 (8KB chunked approach)
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error("Could not fetch image: " + imgResponse.status);
  const imgBuffer = await imgResponse.arrayBuffer();

  const bytes = new Uint8Array(imgBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  const base64 = btoa(binary);

  const prompt = `You are a Tampa Bay, Florida (USDA Zone 9b/10a) gardening expert and plant pathologist.

This ${common} (${scientific || "unknown species"}) appears ${health}. ${notes ? "The gardener notes: " + notes : ""}

Analyze the photo and diagnose what might be wrong. Return ONLY a JSON object with exactly these fields:
{
  "cause": "Most likely cause of the issue (e.g. 'Iron chlorosis from alkaline soil')",
  "severity": "mild" or "moderate" or "severe",
  "action": "Specific recommended treatment for Tampa Bay climate and conditions",
  "details": "2-3 sentence explanation of the diagnosis, what signs you see, and why the recommended action should help"
}

Be specific to Tampa Bay's subtropical climate, sandy alkaline soil, humidity, and common local pests/diseases. Return ONLY the JSON object, no other text.`;

  const claudeResponse = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64,
            },
          },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });

  if (!claudeResponse.ok) {
    const errText = await claudeResponse.text();
    throw new Error("Claude API error: " + errText);
  }

  const claudeResult = await claudeResponse.json();
  const text = claudeResult.content[0].text.trim();
  const clean = text.replace(/```json|```/g, "").trim();
  const diagnosis = JSON.parse(clean);

  return { diagnosis };
}
