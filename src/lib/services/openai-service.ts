import OpenAI from 'openai';
import { FilterCriteria } from '@/types/screener';

interface QueryParseResult {
  filters: FilterCriteria;
  confidence: number;
  suggestions: string[];
}

interface AlternativeSearchResult {
  stocks: any[];
  suggestions: string[];
}

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseQuery(query: string): Promise<QueryParseResult> {
    try {
      const systemPrompt = `You are an expert financial analyst that converts natural language stock screening queries into structured filter criteria.

Extract the following information from the user's query and return it as JSON:
- priceMin: minimum stock price (number or null)
- priceMax: maximum stock price (number or null)
- marketCapMin: minimum market cap in billions (number or null)
- marketCapMax: maximum market cap in billions (number or null)
- volumeMin: minimum daily volume (number or null)
- sector: specific sector (string or null)
- exchange: specific exchange like NYSE, NASDAQ (string or null)
- peRatioMin: minimum P/E ratio (number or null)
- peRatioMax: maximum P/E ratio (number or null)
- dividendYieldMin: minimum dividend yield percentage (number or null)

Also provide:
- confidence: your confidence in the parsing (0-1)
- suggestions: array of 2-3 alternative query phrasings

Example input: "Find tech stocks under $100 with market cap over 1B"
Example output:
{
  "filters": {
    "priceMax": 100,
    "marketCapMin": 1,
    "sector": "Technology"
  },
  "confidence": 0.95,
  "suggestions": [
    "Technology companies under $100 with large market cap",
    "Tech stocks below $100 price with market cap above $1 billion"
  ]
}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      return {
        filters: {
          search: '',
          sector: 'all',
          exchange: 'all',
          ...parsed.filters
        },
        confidence: parsed.confidence || 0.5,
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      console.error('Error parsing query with OpenAI:', error);
      return {
        filters: {
          search: '',
          sector: 'all',
          exchange: 'all'
        },
        confidence: 0,
        suggestions: ['Try a more specific query like "tech stocks under $50"']
      };
    }
  }

  async generateAlternativeSearch(originalQuery: string, failedFilters: FilterCriteria): Promise<AlternativeSearchResult> {
    try {
      const systemPrompt = `You are a financial advisor helping users find stocks when their original search returned no results.

Given the original query and failed filters, suggest:
1. 3-5 popular stocks that might interest the user
2. 2-3 alternative search suggestions with relaxed criteria

Return JSON with:
- stocks: array of stock objects with {ticker, name, price, sector}
- suggestions: array of alternative query strings

Focus on well-known, liquid stocks that are similar to what the user was looking for.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Original query: "${originalQuery}"\nFailed filters: ${JSON.stringify(failedFilters)}` 
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      return {
        stocks: parsed.stocks || [],
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      console.error('Error generating alternative search:', error);
      return {
        stocks: [],
        suggestions: [
          'Try searching for "popular tech stocks"',
          'Look for "dividend stocks under $100"',
          'Search "high volume stocks today"'
        ]
      };
    }
  }

  async optimizeQuery(query: string, resultCount: number): Promise<string[]> {
    try {
      const systemPrompt = `You are a stock screening expert. Given a query and the number of results it returned, suggest 2-3 optimized versions.

If resultCount is 0: suggest broader, less restrictive queries
If resultCount is very high (>100): suggest more specific, restrictive queries
If resultCount is good (10-50): suggest similar queries with slight variations

Return only an array of strings (the suggested queries).`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Query: "${query}"\nResult count: ${resultCount}` 
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Error optimizing query:', error);
      return [];
    }
  }
}

export const openaiService = new OpenAIService();