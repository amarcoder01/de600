// Data validation utilities for stock data accuracy
export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  correctedData?: any;
}

export interface StockDataValidation {
  symbol: string;
  price: ValidationResult;
  volume: ValidationResult;
  sector: ValidationResult;
  marketCap: ValidationResult;
  overallScore: number;
}

// Volume validation - check for realistic volume ranges
export function validateVolume(volume: number, symbol: string): ValidationResult {
  const issues: string[] = [];
  let score = 100;

  // Check for unrealistic volume values
  if (volume <= 0) {
    issues.push("Volume cannot be zero or negative");
    score = 0;
  } else if (volume < 100) {
    issues.push("Volume too low - likely data error");
    score = 20;
  } else if (volume > 1000000000) { // 1 billion
    issues.push("Volume unusually high - verify data source");
    score = 60;
  }

  // Check for common data errors (like volume in thousands vs actual)
  if (volume > 1000000 && volume % 1000 === 0) {
    issues.push("Volume may be in thousands - verify format");
    score = Math.min(score, 70);
  }

  return {
    isValid: issues.length === 0,
    score,
    issues
  };
}

// Price validation - check for realistic price ranges
export function validatePrice(price: number, symbol: string): ValidationResult {
  const issues: string[] = [];
  let score = 100;

  if (price <= 0) {
    issues.push("Price cannot be zero or negative");
    score = 0;
  } else if (price > 10000) {
    issues.push("Price unusually high - verify data source");
    score = 80;
  } else if (price < 0.01) {
    issues.push("Price unusually low - verify data source");
    score = 80;
  }

  return {
    isValid: issues.length === 0,
    score,
    issues
  };
}

// Market cap validation
export function validateMarketCap(marketCap: number, symbol: string): ValidationResult {
  const issues: string[] = [];
  let score = 100;

  if (marketCap <= 0) {
    issues.push("Market cap cannot be zero or negative");
    score = 0;
  } else if (marketCap > 10000000000000) { // 10 trillion
    issues.push("Market cap unusually high - verify data source");
    score = 80;
  }

  return {
    isValid: issues.length === 0,
    score,
    issues
  };
}

// Complete stock data validation
export function validateStockData(data: any): StockDataValidation {
  const priceValidation = validatePrice(data.price || data.c || 0, data.symbol);
  const volumeValidation = validateVolume(data.volume || data.v || 0, data.symbol);
  const marketCapValidation = validateMarketCap(data.marketCap || 0, data.symbol);
  
  // Import sector validation dynamically to avoid circular imports
  const sectorValidation: ValidationResult = {
    isValid: true,
    score: data.sector ? 100 : 0,
    issues: data.sector ? [] : ['Sector missing']
  };

  const overallScore = Math.round(
    (priceValidation.score + volumeValidation.score + marketCapValidation.score + sectorValidation.score) / 4
  );

  return {
    symbol: data.symbol,
    price: priceValidation,
    volume: volumeValidation,
    sector: sectorValidation,
    marketCap: marketCapValidation,
    overallScore
  };
}

// Data quality scoring
export function getDataQualityScore(validations: StockDataValidation[]): number {
  if (validations.length === 0) return 0;
  
  const totalScore = validations.reduce((sum, validation) => sum + validation.overallScore, 0);
  return Math.round(totalScore / validations.length);
}
