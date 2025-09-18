// Sector validation and mapping utilities
import { ValidationResult } from './data-validation';

// Comprehensive sector mapping
export const SECTOR_MAPPING: Record<string, string> = {
  // Technology
  'Technology': 'Technology',
  'Software': 'Technology',
  'Hardware': 'Technology',
  'Semiconductors': 'Technology',
  'Internet': 'Technology',
  'Computer Services': 'Technology',
  'Electronic Equipment': 'Technology',
  
  // Healthcare
  'Healthcare': 'Healthcare',
  'Biotechnology': 'Healthcare',
  'Pharmaceuticals': 'Healthcare',
  'Medical Devices': 'Healthcare',
  'Health Services': 'Healthcare',
  
  // Financial Services
  'Financial Services': 'Financial Services',
  'Banks': 'Financial Services',
  'Insurance': 'Financial Services',
  'Investment Services': 'Financial Services',
  'Real Estate': 'Financial Services',
  
  // Consumer
  'Consumer Discretionary': 'Consumer Discretionary',
  'Consumer Staples': 'Consumer Staples',
  'Retail': 'Consumer Discretionary',
  'Restaurants': 'Consumer Discretionary',
  'Automotive': 'Consumer Discretionary',
  
  // Energy
  'Energy': 'Energy',
  'Oil & Gas': 'Energy',
  'Renewable Energy': 'Energy',
  'Utilities': 'Utilities',
  
  // Industrial
  'Industrials': 'Industrials',
  'Manufacturing': 'Industrials',
  'Aerospace': 'Industrials',
  'Transportation': 'Industrials',
  
  // Materials
  'Materials': 'Materials',
  'Mining': 'Materials',
  'Chemicals': 'Materials',
  'Metals': 'Materials',
  
  // Communication
  'Communication Services': 'Communication Services',
  'Telecommunications': 'Communication Services',
  'Media': 'Communication Services',
  'Entertainment': 'Communication Services'
};

export const VALID_SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Discretionary',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Industrials',
  'Materials',
  'Communication Services',
  'Real Estate'
];

// Validate and normalize sector data
export function validateSector(sector: string | null | undefined): ValidationResult {
  const issues: string[] = [];
  let score = 100;
  let correctedData = sector;

  if (!sector || sector.trim() === '') {
    issues.push("Sector is missing or empty");
    score = 0;
    correctedData = 'Unknown';
  } else {
    // Try to map the sector to a standard one
    const normalizedSector = SECTOR_MAPPING[sector] || sector;
    
    if (!VALID_SECTORS.includes(normalizedSector)) {
      issues.push(`Unknown sector: ${sector}`);
      score = 30;
      // Try to find a close match
      const closestMatch = findClosestSector(sector);
      if (closestMatch) {
        correctedData = closestMatch;
        score = 70;
        issues.push(`Mapped to closest match: ${closestMatch}`);
      } else {
        correctedData = 'Other';
      }
    } else {
      correctedData = normalizedSector;
    }
  }

  return {
    isValid: issues.length === 0,
    score,
    issues,
    correctedData
  };
}

// Find closest matching sector using simple string similarity
function findClosestSector(inputSector: string): string | null {
  const input = inputSector.toLowerCase();
  
  for (const [key, value] of Object.entries(SECTOR_MAPPING)) {
    if (key.toLowerCase().includes(input) || input.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return null;
}
