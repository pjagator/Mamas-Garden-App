const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    // Retry on 529 (overloaded) or 500+ server errors
    if (response.status === 529 || (response.status >= 500 && attempt < maxRetries)) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000); // 1s, 2s, 4s, max 8s
      console.log(`Claude API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    return response;
  }

  // Should not reach here, but just in case
  throw new Error("Max retries exceeded");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const imageUrl = body.imageUrl;
    if (!imageUrl) throw new Error("No image URL provided");

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("API key not configured");

    // Fetch image from storage
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok)
      throw new Error("Could not fetch image: " + imgResponse.status);
    const imgBuffer = await imgResponse.arrayBuffer();

    // Convert to base64 using chunked approach (8KB chunks to avoid call stack overflow)
    const bytes = new Uint8Array(imgBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + 8192) as unknown as number[]
      );
    }
    const base64 = btoa(binary);

    const prompt = `You are a botanist and entomologist with deep expertise in Florida species, particularly the Tampa Bay region.

Analyze this image and identify the species. You are not limited to any predefined list. Identify the actual species in the image, whether it is a common garden plant, a Florida native, a non-native ornamental, a weed, an insect, or anything else.

Return ONLY a JSON array of the top 3 most likely identifications, ordered by confidence. No other text.

Each item in the array must have exactly these fields:
{
  "common": "Common name",
  "scientific": "Scientific name",
  "type": "plant" or "bug",
  "category": "e.g. Shrub, Butterfly, Tree, Wildflower, Grass, Vine, Palm, Cycad, Fern, Succulent, Herb, Beetle, Moth, etc.",
  "confidence": number 0-100,
  "isNative": true or false (native to Florida specifically),
  "bloom": ["Spring","Summer","Fall","Winter","Year-round"] or null (plants only, for Tampa Bay),
  "season": ["Spring","Summer","Fall","Winter","Year-round"] or null (insects only, for Tampa Bay),
  "care": "Brief care tip specific to Tampa Bay climate" or null,
  "description": "One sentence description relevant to Tampa Bay gardeners"
}

Important:
- Be precise. Do not guess a common species if the features do not match.
- isNative means native to Florida, not just North America.
- Be honest with confidence. Lower score if the image is blurry or ambiguous.
- If the image does not contain a plant or insect, return an empty array [].`;

    const response = await fetchWithRetry(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            {
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
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error("Claude API error: " + err);
    }

    const result = await response.json();
    const text = result.content[0].text.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const identifications = JSON.parse(clean);

    const enriched = identifications.map(function (id: Record<string, unknown>) {
      return { ...id, source: "Claude AI" };
    });

    return new Response(JSON.stringify({ identifications: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
});
