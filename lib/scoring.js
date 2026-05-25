/**
 * Maravilla Intelligence - Scoring Engine
 * Uses Claude API to score prospects based on ICP fit and intent signals
 * Returns score (1-100) + detailed scoring breakdown
 */

import Anthropic from '@anthropic-ai/sdk';

// Scoring prompt - used by Claude to evaluate prospects
const CLIENT_SCORING_PROMPT = `You are an expert B2B sales consultant for Maravilla Cleaners, a commercial cleaning company specializing in:
- Routine & deep cleaning for office complexes, medical facilities, and government buildings
- Service areas: Florida (Miami-Dade, Broward, Palm Beach, Orange, Hillsborough, Pinellas, Duval, Seminole)
- Target segments: Property Managers (highest priority), Medical Clinics, Office Complexes (100+ employees), Government/GovCon, Newly Formed Companies

You will receive a prospect profile and must:
1. Evaluate how well they fit Maravilla's Ideal Customer Profile (ICP)
2. Estimate their service fit and likely ticket value
3. Identify their business segment
4. Assess intent signals (likelihood they need cleaning services now)
5. Assign a priority level (1=highest, 5=lowest)
6. Generate a personalized icebreaker for outreach

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "service_fit": "high|medium|low",
  "ticket_estimate": "$X,XXX-$X,XXX",
  "segment": "Property Manager|Clinic/Medical|Office Complex|Government/GovCon|Newly Formed|Other",
  "priority": 1|2|3|4|5,
  "intent_signal": "high|medium|low",
  "intent_explanation": "Brief reason for intent assessment",
  "icebreaker": "Personalized opening line for outreach (one sentence)",
  "reasoning": "2-3 sentence explanation of scoring rationale",
  "score": 1-100
}

PROSPECT DATA:
{prospect_json}`;

class ScoringEngine {
  constructor(config) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    this.model = process.env.CLAUDE_MODEL || 'claude-opus-4-1';
    this.maxTokens = 1024;
  }

  /**
   * Score a single prospect using Claude API
   * @param {object} prospect - Prospect data with legal_name, business_email, phone, website, county, employees_estimate
   * @returns {Promise<object>} - Scoring result with service_fit, ticket_estimate, segment, priority, intent_signal, icebreaker, score
   */
  async scoreProspect(prospect) {
    if (!prospect || typeof prospect !== 'object') {
      throw new Error('Prospect must be a valid object');
    }

    try {
      // Build prompt with prospect data
      const prospectJson = JSON.stringify(prospect, null, 2);
      const prompt = CLIENT_SCORING_PROMPT.replace('{prospect_json}', prospectJson);

      // Call Claude API
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Parse response
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      // Extract JSON from response (handle potential markdown code blocks)
      let scoreData = {};
      try {
        // Try parsing directly
        scoreData = JSON.parse(responseText);
      } catch (e) {
        // Try extracting JSON from markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
        if (jsonMatch && jsonMatch[1]) {
          scoreData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Could not parse Claude response as JSON');
        }
      }

      // Validate required fields
      const requiredFields = ['service_fit', 'ticket_estimate', 'segment', 'priority', 'intent_signal', 'icebreaker', 'score'];
      for (const field of requiredFields) {
        if (!(field in scoreData)) {
          throw new Error(`Missing required field in Claude response: ${field}`);
        }
      }

      // Ensure score is numeric (1-100)
      if (typeof scoreData.score !== 'number' || scoreData.score < 1 || scoreData.score > 100) {
        throw new Error('Score must be numeric between 1-100');
      }

      return {
        ...scoreData,
        scored_at: new Date().toISOString(),
        model_used: this.model,
      };
    } catch (error) {
      console.error('Error scoring prospect:', error.message);
      throw error;
    }
  }

  /**
   * Batch score multiple prospects
   * @param {array} prospects - Array of prospect objects
   * @returns {Promise<array>} - Array of scoring results
   */
  async scoreBatch(prospects) {
    if (!Array.isArray(prospects)) {
      throw new Error('Prospects must be an array');
    }

    const results = [];
    for (const prospect of prospects) {
      try {
        const score = await this.scoreProspect(prospect);
        results.push({
          prospect,
          score,
          success: true,
        });
      } catch (error) {
        results.push({
          prospect,
          score: null,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export default ScoringEngine;
