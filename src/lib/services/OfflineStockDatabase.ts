/**
 * Offline Stock Database - Works without any APIs
 * Comprehensive stock data for ChatGPT-like search experience
 */

export interface Stock {
  ticker: string
  name: string
  sector: string
  industry: string
  exchange: string
  description: string
  marketCap: string
  priceRange: string
  tags: string[]
}

export class OfflineStockDatabase {
  private static stocks: Stock[] = [
    // Technology Giants
    { ticker: 'AAPL', name: 'Apple Inc', sector: 'Technology', industry: 'Consumer Electronics', exchange: 'NASDAQ', description: 'iPhone, Mac, iPad maker', marketCap: 'Large', priceRange: '100-200', tags: ['tech', 'consumer', 'mobile', 'innovation'] },
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software', exchange: 'NASDAQ', description: 'Windows, Office, Azure cloud', marketCap: 'Large', priceRange: '300-400', tags: ['tech', 'software', 'cloud', 'enterprise'] },
    { ticker: 'GOOGL', name: 'Alphabet Inc Class A', sector: 'Technology', industry: 'Internet Services', exchange: 'NASDAQ', description: 'Google search, advertising, YouTube', marketCap: 'Large', priceRange: '100-200', tags: ['tech', 'internet', 'advertising', 'ai'] },
    { ticker: 'AMZN', name: 'Amazon.com Inc', sector: 'Technology', industry: 'E-commerce', exchange: 'NASDAQ', description: 'E-commerce, AWS cloud services', marketCap: 'Large', priceRange: '100-200', tags: ['tech', 'ecommerce', 'cloud', 'logistics'] },
    { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Technology', industry: 'Electric Vehicles', exchange: 'NASDAQ', description: 'Electric vehicles, energy storage', marketCap: 'Large', priceRange: '200-300', tags: ['tech', 'automotive', 'electric', 'energy'] },
    { ticker: 'META', name: 'Meta Platforms Inc', sector: 'Technology', industry: 'Social Media', exchange: 'NASDAQ', description: 'Facebook, Instagram, WhatsApp', marketCap: 'Large', priceRange: '400-500', tags: ['tech', 'social', 'metaverse', 'advertising'] },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ', description: 'Graphics cards, AI chips', marketCap: 'Large', priceRange: '400-500', tags: ['tech', 'semiconductors', 'ai', 'gaming'] },
    { ticker: 'NFLX', name: 'Netflix Inc', sector: 'Technology', industry: 'Streaming', exchange: 'NASDAQ', description: 'Video streaming service', marketCap: 'Large', priceRange: '400-500', tags: ['tech', 'entertainment', 'streaming', 'content'] },
    { ticker: 'ADBE', name: 'Adobe Inc', sector: 'Technology', industry: 'Software', exchange: 'NASDAQ', description: 'Creative software, Photoshop, PDF', marketCap: 'Large', priceRange: '400-500', tags: ['tech', 'software', 'creative', 'design'] },
    { ticker: 'CRM', name: 'Salesforce Inc', sector: 'Technology', industry: 'Cloud Software', exchange: 'NYSE', description: 'Customer relationship management', marketCap: 'Large', priceRange: '200-300', tags: ['tech', 'software', 'cloud', 'crm'] },
    
    // More Tech
    { ticker: 'ORCL', name: 'Oracle Corporation', sector: 'Technology', industry: 'Database Software', exchange: 'NYSE', description: 'Database software, enterprise', marketCap: 'Large', priceRange: '100-200', tags: ['tech', 'database', 'enterprise', 'cloud'] },
    { ticker: 'INTC', name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ', description: 'Computer processors, chips', marketCap: 'Large', priceRange: '100-200', tags: ['tech', 'semiconductors', 'processors', 'hardware'] },
    { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ', description: 'Computer processors, graphics', marketCap: 'Large', priceRange: '100-200', tags: ['tech', 'semiconductors', 'processors', 'gaming'] },
    { ticker: 'PYPL', name: 'PayPal Holdings Inc', sector: 'Technology', industry: 'Financial Technology', exchange: 'NASDAQ', description: 'Digital payments platform', marketCap: 'Large', priceRange: '100-200', tags: ['tech', 'fintech', 'payments', 'digital'] },
    { ticker: 'UBER', name: 'Uber Technologies Inc', sector: 'Technology', industry: 'Ride Sharing', exchange: 'NYSE', description: 'Ride sharing, food delivery', marketCap: 'Large', priceRange: '100-200', tags: ['tech', 'transportation', 'gig economy', 'mobility'] },
    
    // Healthcare
    { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'NYSE', description: 'Pharmaceuticals, medical devices', marketCap: 'Large', priceRange: '100-200', tags: ['healthcare', 'pharma', 'medical', 'dividend'] },
    { ticker: 'PFE', name: 'Pfizer Inc', sector: 'Healthcare', industry: 'Pharmaceuticals', exchange: 'NYSE', description: 'Pharmaceuticals, vaccines', marketCap: 'Large', priceRange: '100-200', tags: ['healthcare', 'pharma', 'vaccines', 'dividend'] },
    { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', industry: 'Health Insurance', exchange: 'NYSE', description: 'Health insurance, healthcare', marketCap: 'Large', priceRange: '400-500', tags: ['healthcare', 'insurance', 'managed care', 'dividend'] },
    { ticker: 'ABBV', name: 'AbbVie Inc', sector: 'Healthcare', industry: 'Biotechnology', exchange: 'NYSE', description: 'Biopharmaceuticals', marketCap: 'Large', priceRange: '100-200', tags: ['healthcare', 'biotech', 'pharma', 'dividend'] },
    { ticker: 'TMO', name: 'Thermo Fisher Scientific', sector: 'Healthcare', industry: 'Medical Equipment', exchange: 'NYSE', description: 'Medical equipment, lab instruments', marketCap: 'Large', priceRange: '400-500', tags: ['healthcare', 'medical equipment', 'lab', 'research'] },
    
    // Financial
    { ticker: 'JPM', name: 'JPMorgan Chase & Co', sector: 'Financial', industry: 'Banking', exchange: 'NYSE', description: 'Investment banking, commercial banking', marketCap: 'Large', priceRange: '100-200', tags: ['financial', 'banking', 'investment', 'dividend'] },
    { ticker: 'BAC', name: 'Bank of America Corp', sector: 'Financial', industry: 'Banking', exchange: 'NYSE', description: 'Commercial banking, investment', marketCap: 'Large', priceRange: '100-200', tags: ['financial', 'banking', 'commercial', 'dividend'] },
    { ticker: 'WFC', name: 'Wells Fargo & Company', sector: 'Financial', industry: 'Banking', exchange: 'NYSE', description: 'Commercial banking, mortgages', marketCap: 'Large', priceRange: '100-200', tags: ['financial', 'banking', 'mortgages', 'dividend'] },
    { ticker: 'GS', name: 'Goldman Sachs Group', sector: 'Financial', industry: 'Investment Banking', exchange: 'NYSE', description: 'Investment banking, trading', marketCap: 'Large', priceRange: '300-400', tags: ['financial', 'investment banking', 'trading', 'wealth'] },
    { ticker: 'MS', name: 'Morgan Stanley', sector: 'Financial', industry: 'Investment Banking', exchange: 'NYSE', description: 'Investment banking, wealth management', marketCap: 'Large', priceRange: '100-200', tags: ['financial', 'investment banking', 'wealth', 'trading'] },
    
    // Consumer
    { ticker: 'WMT', name: 'Walmart Inc', sector: 'Consumer', industry: 'Retail', exchange: 'NYSE', description: 'Discount retail stores', marketCap: 'Large', priceRange: '100-200', tags: ['consumer', 'retail', 'discount', 'dividend'] },
    { ticker: 'HD', name: 'Home Depot Inc', sector: 'Consumer', industry: 'Home Improvement', exchange: 'NYSE', description: 'Home improvement retail', marketCap: 'Large', priceRange: '300-400', tags: ['consumer', 'retail', 'home improvement', 'dividend'] },
    { ticker: 'PG', name: 'Procter & Gamble Co', sector: 'Consumer', industry: 'Consumer Goods', exchange: 'NYSE', description: 'Consumer products, brands', marketCap: 'Large', priceRange: '100-200', tags: ['consumer', 'brands', 'household', 'dividend'] },
    { ticker: 'KO', name: 'Coca-Cola Company', sector: 'Consumer', industry: 'Beverages', exchange: 'NYSE', description: 'Soft drinks, beverages', marketCap: 'Large', priceRange: '100-200', tags: ['consumer', 'beverages', 'brands', 'dividend'] },
    { ticker: 'PEP', name: 'PepsiCo Inc', sector: 'Consumer', industry: 'Beverages', exchange: 'NASDAQ', description: 'Beverages, snacks', marketCap: 'Large', priceRange: '100-200', tags: ['consumer', 'beverages', 'snacks', 'dividend'] },
    
    // Energy
    { ticker: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas', exchange: 'NYSE', description: 'Oil and gas exploration, refining', marketCap: 'Large', priceRange: '100-200', tags: ['energy', 'oil', 'gas', 'dividend'] },
    { ticker: 'CVX', name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas', exchange: 'NYSE', description: 'Oil and gas, integrated energy', marketCap: 'Large', priceRange: '100-200', tags: ['energy', 'oil', 'gas', 'dividend'] },
    { ticker: 'COP', name: 'ConocoPhillips', sector: 'Energy', industry: 'Oil & Gas', exchange: 'NYSE', description: 'Oil and gas exploration', marketCap: 'Large', priceRange: '100-200', tags: ['energy', 'oil', 'exploration', 'dividend'] },
    
    // Industrial
    { ticker: 'BA', name: 'Boeing Company', sector: 'Industrial', industry: 'Aerospace', exchange: 'NYSE', description: 'Commercial aircraft, defense', marketCap: 'Large', priceRange: '100-200', tags: ['industrial', 'aerospace', 'defense', 'aviation'] },
    { ticker: 'CAT', name: 'Caterpillar Inc', sector: 'Industrial', industry: 'Machinery', exchange: 'NYSE', description: 'Construction machinery, mining', marketCap: 'Large', priceRange: '200-300', tags: ['industrial', 'machinery', 'construction', 'dividend'] },
    { ticker: 'GE', name: 'General Electric Company', sector: 'Industrial', industry: 'Conglomerate', exchange: 'NYSE', description: 'Aviation, power, renewable energy', marketCap: 'Large', priceRange: '100-200', tags: ['industrial', 'conglomerate', 'aviation', 'power'] }
  ]

  /**
   * Search stocks by any criteria - like ChatGPT
   */
  static search(query: string): Stock[] {
    const queryLower = query.toLowerCase()
    const words = queryLower.split(' ').filter(word => word.length > 2)
    
    return this.stocks.filter(stock => {
      const searchText = `
        ${stock.ticker} ${stock.name} ${stock.sector} ${stock.industry} 
        ${stock.description} ${stock.tags.join(' ')}
      `.toLowerCase()
      
      // Check if any query words match
      return words.some(word => searchText.includes(word))
    })
  }

  /**
   * Get stocks by sector
   */
  static getBySector(sector: string): Stock[] {
    return this.stocks.filter(stock => 
      stock.sector.toLowerCase().includes(sector.toLowerCase())
    )
  }

  /**
   * Get stocks by price range
   */
  static getByPriceRange(min: number, max: number): Stock[] {
    return this.stocks.filter(stock => {
      if (min <= 100 && max >= 200 && stock.priceRange === '100-200') return true
      if (min <= 200 && max >= 300 && stock.priceRange === '200-300') return true
      if (min <= 300 && max >= 400 && stock.priceRange === '300-400') return true
      if (min <= 400 && max >= 500 && stock.priceRange === '400-500') return true
      return false
    })
  }

  /**
   * Get all stocks
   */
  static getAll(): Stock[] {
    return this.stocks
  }

  /**
   * Get popular suggestions
   */
  static getSuggestions(): string[] {
    return [
      'Tech stocks between $100 and $500',
      'High dividend healthcare stocks', 
      'Banking stocks with good dividends',
      'Large cap technology companies',
      'Energy stocks for income',
      'Consumer brands with strong moats',
      'Cloud software companies',
      'Electric vehicle stocks',
      'Artificial intelligence stocks',
      'Renewable energy companies'
    ]
  }
}
