import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FilterCriteria } from '@/types/screener';

interface QueryHistory {
  id: string;
  user_id: string;
  original_query: string;
  parsed_filters: FilterCriteria;
  result_count: number;
  execution_time: number;
  created_at: string;
}

interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filter_criteria: FilterCriteria;
  created_at: string;
  updated_at: string;
}

interface QueryResult {
  id: string;
  query_id: string;
  ticker: string;
  stock_data: any;
  cached_at: string;
}

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  // Query History Operations
  async saveQueryHistory(
    userId: string,
    originalQuery: string,
    parsedFilters: FilterCriteria,
    resultCount: number,
    executionTime: number
  ): Promise<string | null> {
    try {
      const { data, error } = await this.client
        .from('query_history')
        .insert({
          user_id: userId,
          original_query: originalQuery,
          parsed_filters: parsedFilters,
          result_count: resultCount,
          execution_time: executionTime
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving query history:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error saving query history:', error);
      return null;
    }
  }

  async getQueryHistory(userId: string, limit: number = 10): Promise<QueryHistory[]> {
    try {
      const { data, error } = await this.client
        .from('query_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching query history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching query history:', error);
      return [];
    }
  }

  // Saved Filters Operations
  async saveFilter(
    userId: string,
    name: string,
    filterCriteria: FilterCriteria
  ): Promise<string | null> {
    try {
      const { data, error } = await this.client
        .from('saved_filters')
        .insert({
          user_id: userId,
          name: name,
          filter_criteria: filterCriteria
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving filter:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error saving filter:', error);
      return null;
    }
  }

  async getSavedFilters(userId: string): Promise<SavedFilter[]> {
    try {
      const { data, error } = await this.client
        .from('saved_filters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved filters:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching saved filters:', error);
      return [];
    }
  }

  async deleteFilter(filterId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('saved_filters')
        .delete()
        .eq('id', filterId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting filter:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting filter:', error);
      return false;
    }
  }

  // Query Results Cache Operations
  async cacheQueryResults(
    queryId: string,
    results: Array<{ ticker: string; data: any }>
  ): Promise<boolean> {
    try {
      const insertData = results.map(result => ({
        query_id: queryId,
        ticker: result.ticker,
        stock_data: result.data
      }));

      const { error } = await this.client
        .from('query_results')
        .insert(insertData);

      if (error) {
        console.error('Error caching query results:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error caching query results:', error);
      return false;
    }
  }

  async getCachedResults(queryId: string): Promise<QueryResult[]> {
    try {
      const { data, error } = await this.client
        .from('query_results')
        .select('*')
        .eq('query_id', queryId)
        .order('cached_at', { ascending: false });

      if (error) {
        console.error('Error fetching cached results:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching cached results:', error);
      return [];
    }
  }

  // Clean up old cache entries
  async cleanupOldCache(daysOld: number = 7): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await this.client
        .from('query_results')
        .delete()
        .lt('cached_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up cache:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error cleaning up cache:', error);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();