'use client'

import React from 'react'
import UnifiedStrategyBuilder from './UnifiedStrategyBuilder'
import type { Strategy } from '@/lib/strategy-builder-service'

interface AdvancedStrategyBuilderProps {
  onStrategyGenerated?: (strategy: Strategy) => void
}

export default function AdvancedStrategyBuilder({ onStrategyGenerated }: AdvancedStrategyBuilderProps) {
  return <UnifiedStrategyBuilder onStrategyGenerated={onStrategyGenerated} />
}
