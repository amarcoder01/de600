import { NextRequest, NextResponse } from 'next/server'
import { PolygonDataService } from '@/lib/polygon-data-service'

// POST - Get sector data for multiple symbols
export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json()
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Symbols array is required'
      }, { status: 400 })
    }

    console.log('API: Fetching sector data for symbols:', symbols)

    const polygonService = new PolygonDataService()
    const sectorData: Record<string, { sector: string; industry: string; name: string }> = {}

    // Fetch sector data for each symbol
    await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          const tickerDetails = await polygonService.getTickerDetails(symbol)
          
          // Extract sector and industry from SIC description
          const sicDescription = tickerDetails.sic_description || 'Unknown'
          const sector = extractSectorFromSIC(sicDescription)
          const industry = sicDescription

          sectorData[symbol] = {
            sector,
            industry,
            name: tickerDetails.name || symbol
          }

          console.log(`✅ API: Sector data for ${symbol}:`, sectorData[symbol])
        } catch (error) {
          console.error(`❌ API: Error fetching sector data for ${symbol}:`, error)
          // Use fallback data
          sectorData[symbol] = {
            sector: 'Unknown',
            industry: 'Unknown',
            name: symbol
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: sectorData
    })

  } catch (error) {
    console.error('API: Error fetching sector data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sector data'
    }, { status: 500 })
  }
}

// Helper function to extract sector from SIC description
function extractSectorFromSIC(sicDescription: string): string {
  const description = sicDescription.toLowerCase()
  
  // Technology
  if (description.includes('computer') || description.includes('software') || 
      description.includes('technology') || description.includes('semiconductor') ||
      description.includes('internet') || description.includes('telecommunications')) {
    return 'Technology'
  }
  
  // Healthcare
  if (description.includes('health') || description.includes('medical') || 
      description.includes('pharmaceutical') || description.includes('biotechnology') ||
      description.includes('drug') || description.includes('hospital')) {
    return 'Healthcare'
  }
  
  // Financial Services
  if (description.includes('bank') || description.includes('financial') || 
      description.includes('insurance') || description.includes('investment') ||
      description.includes('credit') || description.includes('lending')) {
    return 'Financial Services'
  }
  
  // Consumer Discretionary
  if (description.includes('retail') || description.includes('automotive') || 
      description.includes('entertainment') || description.includes('restaurant') ||
      description.includes('hotel') || description.includes('apparel')) {
    return 'Consumer Discretionary'
  }
  
  // Consumer Staples
  if (description.includes('food') || description.includes('beverage') || 
      description.includes('household') || description.includes('personal care') ||
      description.includes('tobacco')) {
    return 'Consumer Staples'
  }
  
  // Energy
  if (description.includes('oil') || description.includes('gas') || 
      description.includes('energy') || description.includes('petroleum') ||
      description.includes('utility')) {
    return 'Energy'
  }
  
  // Industrials
  if (description.includes('manufacturing') || description.includes('aerospace') || 
      description.includes('defense') || description.includes('machinery') ||
      description.includes('construction') || description.includes('transportation')) {
    return 'Industrials'
  }
  
  // Materials
  if (description.includes('chemical') || description.includes('mining') || 
      description.includes('metal') || description.includes('forest') ||
      description.includes('paper') || description.includes('steel')) {
    return 'Materials'
  }
  
  // Real Estate
  if (description.includes('real estate') || description.includes('property') || 
      description.includes('reit') || description.includes('commercial property')) {
    return 'Real Estate'
  }
  
  // Communication Services
  if (description.includes('media') || description.includes('broadcasting') || 
      description.includes('publishing') || description.includes('advertising')) {
    return 'Communication Services'
  }
  
  // Utilities
  if (description.includes('electric') || description.includes('water') || 
      description.includes('natural gas') || description.includes('utility')) {
    return 'Utilities'
  }
  
  return 'Other'
}
