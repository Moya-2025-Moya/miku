import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

// Lazy singleton so a missing key fails at request time with a clear message
// (caught and surfaced as a 500) rather than crashing module load / the build.
export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}
