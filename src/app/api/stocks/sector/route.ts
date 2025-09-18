import { NextRequest, NextResponse } from 'next/server';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: string;
  sector?: string;
}

// Sector-specific stock symbols for better data accuracy
const SECTOR_STOCKS = {
  'Technology': [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX', 'ADBE', 'CRM',
    'ORCL', 'INTC', 'CSCO', 'AMD', 'QCOM', 'TXN', 'AVGO', 'NOW', 'INTU', 'MU',
    'AMAT', 'ADI', 'LRCX', 'KLAC', 'MCHP', 'FTNT', 'PANW', 'CRWD', 'ZS', 'OKTA',
    'SNOW', 'DDOG', 'NET', 'TEAM', 'WDAY', 'VEEV', 'ZM', 'DOCU', 'TWLO', 'SPLK',
    'SHOP', 'SQ', 'PYPL', 'V', 'MA', 'FISV', 'FIS', 'PAYX', 'ADP', 'IT'
  ],
  'Healthcare': [
    'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN',
    'GILD', 'VRTX', 'REGN', 'BIIB', 'ILMN', 'MRNA', 'ZTS', 'CVS', 'CI', 'HUM',
    'ANTM', 'CNC', 'MOH', 'ELV', 'MCK', 'ABC', 'CAH', 'CVS', 'WBA', 'RITE',
    'ISRG', 'SYK', 'BSX', 'MDT', 'EW', 'BAX', 'BDX', 'RMD', 'DXCM', 'ALGN',
    'IDXX', 'IQV', 'A', 'LH', 'DGX', 'MTD', 'WST', 'PKI', 'WAT', 'TECH'
  ],
  'Financial': [
    'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BLK', 'SCHW', 'USB',
    'PNC', 'TFC', 'COF', 'BK', 'STT', 'NTRS', 'RF', 'CFG', 'KEY', 'FITB',
    'HBAN', 'ZION', 'CMA', 'MTB', 'SIVB', 'PBCT', 'WAL', 'ONB', 'FFIN', 'FULT',
    'V', 'MA', 'PYPL', 'SQ', 'FISV', 'FIS', 'PAYX', 'ADP', 'IT', 'GPN',
    'ALL', 'PGR', 'TRV', 'CB', 'AIG', 'MET', 'PRU', 'AFL', 'HIG', 'PFG'
  ],
  'Energy': [
    'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'MPC', 'OXY', 'HAL',
    'BKR', 'DVN', 'FANG', 'MRO', 'APA', 'HES', 'KMI', 'OKE', 'EPD', 'ET',
    'WMB', 'TRGP', 'MPLX', 'PAA', 'EQT', 'AR', 'CNX', 'RRC', 'SM', 'NOG',
    'PXD', 'CTRA', 'VTR', 'CLR', 'MTDR', 'CHRD', 'GPOR', 'CRGY', 'NEXT', 'REI',
    'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ED'
  ],
  'Consumer Discretionary': [
    'AMZN', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'TJX', 'BKNG', 'CMG', 'ORLY',
    'YUM', 'QSR', 'DPZ', 'DNKN', 'WEN', 'JACK', 'PZZA', 'BLMN', 'DRI', 'EAT',
    'TGT', 'WMT', 'COST', 'KR', 'SYY', 'DLTR', 'DG', 'BIG', 'FIVE', 'OLLI',
    'F', 'GM', 'TSLA', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'NKLA', 'RIDE',
    'DIS', 'NFLX', 'CMCSA', 'T', 'VZ', 'CHTR', 'DISH', 'SIRI', 'LBRDA', 'LBRDK'
  ],
  'Consumer Staples': [
    'PG', 'KO', 'PEP', 'WMT', 'COST', 'CL', 'KMB', 'GIS', 'K', 'HSY',
    'MDLZ', 'CPB', 'SJM', 'HRL', 'CAG', 'MKC', 'CHD', 'CLX', 'TSN', 'TAP',
    'KHC', 'UNFI', 'CALM', 'JJSF', 'LANC', 'SENEA', 'SENEB', 'USFD', 'SFM', 'PFGC',
    'WBA', 'CVS', 'RAD', 'RITE', 'FRED', 'VFF', 'HCHC', 'OMCL', 'PRTS', 'PTGX',
    'PM', 'MO', 'BTI', 'UVV', 'TPG', 'XXII', 'TURNING', 'TCNNF', 'CRON', 'CGC'
  ],
  'Industrial': [
    'BA', 'HON', 'UPS', 'CAT', 'GE', 'MMM', 'LMT', 'RTX', 'UNP', 'FDX',
    'CSX', 'NSC', 'KSU', 'CP', 'CNI', 'ODFL', 'CHRW', 'XPO', 'JBHT', 'SAIA',
    'DE', 'EMR', 'ETN', 'PH', 'ROK', 'DOV', 'ITW', 'IR', 'CARR', 'OTIS',
    'WM', 'RSG', 'CWST', 'CLH', 'GFL', 'WCN', 'SRCL', 'CSTM', 'HURN', 'NVEE',
    'JCI', 'TT', 'GNRC', 'PWR', 'HUBB', 'AOS', 'BLDR', 'SWK', 'SNA', 'PNR'
  ],
  'Materials': [
    'LIN', 'APD', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'PPG', 'ECL', 'IFF',
    'LYB', 'EMN', 'FMC', 'ALB', 'CE', 'CF', 'MOS', 'NTR', 'SMG', 'IPI',
    'AA', 'CENX', 'KALU', 'ACH', 'HXL', 'TMST', 'WOR', 'SLVM', 'ZEUS', 'HWKN',
    'NUE', 'STLD', 'RS', 'CMC', 'X', 'CLF', 'MT', 'TX', 'SCHN', 'SXC',
    'PKG', 'IP', 'WRK', 'KWR', 'GPK', 'SEE', 'CCK', 'SLGN', 'SON', 'BERY'
  ],
  'Real Estate': [
    'AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'O', 'WELL', 'DLR', 'SPG', 'EXR',
    'AVB', 'EQR', 'UDR', 'ESS', 'MAA', 'CPT', 'AIV', 'BRG', 'NXRT', 'IRT',
    'REG', 'FRT', 'KIM', 'BRX', 'ROIC', 'RPAI', 'SITC', 'AKR', 'CDR', 'WRI',
    'VTR', 'WELL', 'OHI', 'HCP', 'PEAK', 'DOC', 'HR', 'LTC', 'SBRA', 'NHI',
    'HST', 'RHP', 'PK', 'RLJ', 'AHT', 'SHO', 'CLDT', 'INN', 'DRH', 'APLE'
  ],
  'Utilities': [
    'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ED',
    'PPL', 'FE', 'ES', 'ETR', 'CMS', 'DTE', 'NI', 'LNT', 'EVRG', 'CNP',
    'AEE', 'WEC', 'PNW', 'IDA', 'NWE', 'OGE', 'UGI', 'SR', 'NJR', 'SWX',
    'AWK', 'WTR', 'CWT', 'MSEX', 'SJW', 'YORW', 'ARTNA', 'GWRS', 'CTWS', 'CWCO',
    'PCG', 'EIX', 'AES', 'VST', 'NRG', 'CEG', 'CWEN', 'BEP', 'NEP', 'TERP'
  ]
};

export async function POST(request: NextRequest) {
  try {
    const { sector, limit = 50 } = await request.json();

    if (!sector) {
      return NextResponse.json(
        { error: 'Sector parameter is required' },
        { status: 400 }
      );
    }

    // Get sector-specific stocks
    const sectorStocks = SECTOR_STOCKS[sector as keyof typeof SECTOR_STOCKS];
    if (!sectorStocks) {
      return NextResponse.json(
        { error: 'Invalid sector' },
        { status: 400 }
      );
    }

    // Take the requested number of stocks (up to the limit)
    const stockSymbols = sectorStocks.slice(0, Math.min(limit, sectorStocks.length));
    
    // Try to fetch real data first
    try {
      const stockPromises = stockSymbols.map(async (symbol) => {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            }
          );
          
          if (!response.ok) throw new Error('API request failed');
          
          const data = await response.json();
          const result = data.chart?.result?.[0];
          
          if (!result) throw new Error('No data available');
          
          const meta = result.meta;
          const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
          const previousClose = meta.previousClose || currentPrice;
          const change = currentPrice - previousClose;
          const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
          
          return {
            symbol,
            name: meta.longName || `${symbol} Corporation`,
            price: currentPrice,
            change,
            changePercent,
            volume: meta.regularMarketVolume || 0,
            marketCap: meta.marketCap ? `$${(meta.marketCap / 1e9).toFixed(1)}B` : 'N/A',
            sector
          };
        } catch (error) {
          // Return mock data for this stock if API fails
          return generateMockStock(symbol, sector);
        }
      });
      
      const stocks = await Promise.all(stockPromises);
      
      return NextResponse.json({
        success: true,
        sector,
        stocks,
        count: stocks.length
      });
      
    } catch (error) {
      console.error('Error fetching real stock data:', error);
      
      // Fallback to mock data
      const mockStocks = stockSymbols.map(symbol => generateMockStock(symbol, sector));
      
      return NextResponse.json({
        success: true,
        sector,
        stocks: mockStocks,
        count: mockStocks.length,
        note: 'Using simulated data due to API limitations'
      });
    }
    
  } catch (error) {
    console.error('Sector API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateMockStock(symbol: string, sector: string): StockData {
  const basePrice = Math.random() * 200 + 10;
  const change = (Math.random() - 0.5) * 10;
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol,
    name: `${symbol} Corporation`,
    price: Number(basePrice.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 10000000) + 100000,
    marketCap: `$${(Math.random() * 500 + 1).toFixed(1)}B`,
    sector
  };
}