import { FeatureSet } from './feature-engineering'

// Transformer model interfaces
interface TransformerConfig {
  sequenceLength: number
  featureDimension: number
  hiddenDimension: number
  numHeads: number
  numLayers: number
  dropoutRate: number
  learningRate: number
  batchSize: number
  epochs: number
}

interface AttentionWeights {
  weights: number[][]
  headIndex: number
  layerIndex: number
}

interface TransformerPrediction {
  prediction: number
  confidence: number
  priceTarget: {
    target: number
    upper: number
    lower: number
  }
  signal: 'BUY' | 'SELL' | 'HOLD'
  attentionWeights: AttentionWeights[]
  featureImportance: { [key: string]: number }
  reasoning: string
}

interface TrainingMetrics {
  epoch: number
  loss: number
  accuracy: number
  validationLoss: number
  validationAccuracy: number
  learningRate: number
}

// Matrix operations utility class
class MatrixOps {
  static multiply(a: number[][], b: number[][]): number[][] {
    const result: number[][] = []
    for (let i = 0; i < a.length; i++) {
      result[i] = []
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0
        for (let k = 0; k < b.length; k++) {
          sum += a[i][k] * b[k][j]
        }
        result[i][j] = sum
      }
    }
    return result
  }

  static transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]))
  }

  static softmax(values: number[]): number[] {
    const maxVal = Math.max(...values)
    const expValues = values.map(v => Math.exp(v - maxVal))
    const sumExp = expValues.reduce((a, b) => a + b, 0)
    return expValues.map(v => v / sumExp)
  }

  static layerNorm(values: number[], epsilon: number = 1e-6): number[] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const std = Math.sqrt(variance + epsilon)
    return values.map(val => (val - mean) / std)
  }

  static dropout(values: number[], rate: number, training: boolean = true): number[] {
    if (!training) return values
    return values.map(val => Math.random() > rate ? val / (1 - rate) : 0)
  }

  static gelu(x: number): number {
    return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))))
  }

  static relu(x: number): number {
    return Math.max(0, x)
  }
}

// Positional encoding for time series
class PositionalEncoding {
  private encodings: number[][]

  constructor(sequenceLength: number, dimension: number) {
    this.encodings = this.generateEncodings(sequenceLength, dimension)
  }

  private generateEncodings(seqLen: number, dim: number): number[][] {
    const encodings: number[][] = []
    
    for (let pos = 0; pos < seqLen; pos++) {
      const encoding: number[] = []
      
      for (let i = 0; i < dim; i++) {
        if (i % 2 === 0) {
          // Sine for even indices
          encoding[i] = Math.sin(pos / Math.pow(10000, i / dim))
        } else {
          // Cosine for odd indices
          encoding[i] = Math.cos(pos / Math.pow(10000, (i - 1) / dim))
        }
      }
      
      encodings[pos] = encoding
    }
    
    return encodings
  }

  getEncoding(position: number): number[] {
    return this.encodings[position] || new Array(this.encodings[0].length).fill(0)
  }

  addToInput(input: number[][], startPosition: number = 0): number[][] {
    return input.map((sequence, seqIndex) => {
      const encoding = this.getEncoding(startPosition + seqIndex)
      return sequence.map((val, dimIndex) => val + (encoding[dimIndex] || 0))
    })
  }
}

// Multi-head attention mechanism
class MultiHeadAttention {
  private numHeads: number
  private headDim: number
  private dimension: number
  private wq: number[][][] // Query weights for each head
  private wk: number[][][] // Key weights for each head
  private wv: number[][][] // Value weights for each head
  private wo: number[][] // Output projection weights

  constructor(dimension: number, numHeads: number) {
    this.dimension = dimension
    this.numHeads = numHeads
    this.headDim = Math.floor(dimension / numHeads)
    
    // Initialize weights randomly
    this.wq = this.initializeWeights(numHeads, dimension, this.headDim)
    this.wk = this.initializeWeights(numHeads, dimension, this.headDim)
    this.wv = this.initializeWeights(numHeads, dimension, this.headDim)
    this.wo = this.initializeMatrix(dimension, dimension)
  }

  private initializeWeights(heads: number, inputDim: number, outputDim: number): number[][][] {
    const weights: number[][][] = []
    for (let h = 0; h < heads; h++) {
      weights[h] = this.initializeMatrix(inputDim, outputDim)
    }
    return weights
  }

  private initializeMatrix(rows: number, cols: number): number[][] {
    const matrix: number[][] = []
    const scale = Math.sqrt(2.0 / (rows + cols)) // Xavier initialization
    
    for (let i = 0; i < rows; i++) {
      matrix[i] = []
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() - 0.5) * 2 * scale
      }
    }
    return matrix
  }

  forward(input: number[][], mask?: boolean[][]): { output: number[][], attentionWeights: AttentionWeights[] } {
    const seqLen = input.length
    const headOutputs: number[][][] = []
    const allAttentionWeights: AttentionWeights[] = []

    // Process each attention head
    for (let h = 0; h < this.numHeads; h++) {
      const queries = MatrixOps.multiply(input, this.wq[h])
      const keys = MatrixOps.multiply(input, this.wk[h])
      const values = MatrixOps.multiply(input, this.wv[h])

      // Compute attention scores
      const scores: number[][] = []
      for (let i = 0; i < seqLen; i++) {
        scores[i] = []
        for (let j = 0; j < seqLen; j++) {
          let score = 0
          for (let k = 0; k < this.headDim; k++) {
            score += queries[i][k] * keys[j][k]
          }
          scores[i][j] = score / Math.sqrt(this.headDim)
        }
      }

      // Apply mask if provided
      if (mask) {
        for (let i = 0; i < seqLen; i++) {
          for (let j = 0; j < seqLen; j++) {
            if (mask[i][j]) {
              scores[i][j] = -Infinity
            }
          }
        }
      }

      // Apply softmax to get attention weights
      const attentionWeights: number[][] = []
      for (let i = 0; i < seqLen; i++) {
        attentionWeights[i] = MatrixOps.softmax(scores[i])
      }

      // Store attention weights for interpretability
      allAttentionWeights.push({
        weights: attentionWeights,
        headIndex: h,
        layerIndex: 0 // Will be set by the calling layer
      })

      // Compute weighted values
      const headOutput: number[][] = []
      for (let i = 0; i < seqLen; i++) {
        headOutput[i] = new Array(this.headDim).fill(0)
        for (let j = 0; j < seqLen; j++) {
          for (let k = 0; k < this.headDim; k++) {
            headOutput[i][k] += attentionWeights[i][j] * values[j][k]
          }
        }
      }

      headOutputs[h] = headOutput
    }

    // Concatenate all head outputs
    const concatenated: number[][] = []
    for (let i = 0; i < seqLen; i++) {
      concatenated[i] = []
      for (let h = 0; h < this.numHeads; h++) {
        concatenated[i].push(...headOutputs[h][i])
      }
    }

    // Apply output projection
    const output = MatrixOps.multiply(concatenated, this.wo)

    return { output, attentionWeights: allAttentionWeights }
  }
}

// Feed-forward network
class FeedForward {
  private w1: number[][]
  private w2: number[][]
  private b1: number[]
  private b2: number[]

  constructor(dimension: number, hiddenDimension: number) {
    this.w1 = this.initializeMatrix(dimension, hiddenDimension)
    this.w2 = this.initializeMatrix(hiddenDimension, dimension)
    this.b1 = new Array(hiddenDimension).fill(0)
    this.b2 = new Array(dimension).fill(0)
  }

  private initializeMatrix(rows: number, cols: number): number[][] {
    const matrix: number[][] = []
    const scale = Math.sqrt(2.0 / (rows + cols))
    
    for (let i = 0; i < rows; i++) {
      matrix[i] = []
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() - 0.5) * 2 * scale
      }
    }
    return matrix
  }

  forward(input: number[][], dropoutRate: number = 0, training: boolean = true): number[][] {
    // First linear transformation + bias
    const hidden = MatrixOps.multiply(input, this.w1)
    for (let i = 0; i < hidden.length; i++) {
      for (let j = 0; j < hidden[i].length; j++) {
        hidden[i][j] += this.b1[j]
        hidden[i][j] = MatrixOps.gelu(hidden[i][j]) // GELU activation
      }
    }

    // Apply dropout
    const droppedHidden = hidden.map(row => MatrixOps.dropout(row, dropoutRate, training))

    // Second linear transformation + bias
    const output = MatrixOps.multiply(droppedHidden, this.w2)
    for (let i = 0; i < output.length; i++) {
      for (let j = 0; j < output[i].length; j++) {
        output[i][j] += this.b2[j]
      }
    }

    return output
  }
}

// Transformer encoder layer
class TransformerLayer {
  private attention: MultiHeadAttention
  private feedForward: FeedForward
  private layerIndex: number

  constructor(dimension: number, numHeads: number, hiddenDimension: number, layerIndex: number) {
    this.attention = new MultiHeadAttention(dimension, numHeads)
    this.feedForward = new FeedForward(dimension, hiddenDimension)
    this.layerIndex = layerIndex
  }

  forward(
    input: number[][],
    mask?: boolean[][],
    dropoutRate: number = 0,
    training: boolean = true
  ): { output: number[][], attentionWeights: AttentionWeights[] } {
    // Multi-head attention with residual connection and layer norm
    const { output: attentionOutput, attentionWeights } = this.attention.forward(input, mask)
    
    // Set layer index for attention weights
    attentionWeights.forEach(aw => aw.layerIndex = this.layerIndex)
    
    // Residual connection + layer norm
    const attentionResidual: number[][] = []
    for (let i = 0; i < input.length; i++) {
      attentionResidual[i] = []
      for (let j = 0; j < input[i].length; j++) {
        attentionResidual[i][j] = input[i][j] + attentionOutput[i][j]
      }
      attentionResidual[i] = MatrixOps.layerNorm(attentionResidual[i])
    }

    // Feed-forward with residual connection and layer norm
    const ffOutput = this.feedForward.forward(attentionResidual, dropoutRate, training)
    
    const output: number[][] = []
    for (let i = 0; i < attentionResidual.length; i++) {
      output[i] = []
      for (let j = 0; j < attentionResidual[i].length; j++) {
        output[i][j] = attentionResidual[i][j] + ffOutput[i][j]
      }
      output[i] = MatrixOps.layerNorm(output[i])
    }

    return { output, attentionWeights }
  }
}

// Main Transformer model for time series prediction
class TransformerModel {
  private config: TransformerConfig
  private layers: TransformerLayer[]
  private positionalEncoding: PositionalEncoding
  private inputProjection: number[][]
  private outputProjection: number[][]
  private trainingHistory: TrainingMetrics[]
  private isTraining: boolean

  constructor(config: TransformerConfig) {
    this.config = config
    this.isTraining = false
    this.trainingHistory = []
    
    // Initialize layers
    this.layers = []
    for (let i = 0; i < config.numLayers; i++) {
      this.layers.push(new TransformerLayer(
        config.hiddenDimension,
        config.numHeads,
        config.hiddenDimension * 4, // Standard practice: FFN hidden dim = 4 * model dim
        i
      ))
    }

    // Initialize positional encoding
    this.positionalEncoding = new PositionalEncoding(
      config.sequenceLength,
      config.hiddenDimension
    )

    // Initialize projection layers
    this.inputProjection = this.initializeMatrix(config.featureDimension, config.hiddenDimension)
    this.outputProjection = this.initializeMatrix(config.hiddenDimension, 1) // Single output for price prediction
  }

  private initializeMatrix(rows: number, cols: number): number[][] {
    const matrix: number[][] = []
    const scale = Math.sqrt(2.0 / (rows + cols))
    
    for (let i = 0; i < rows; i++) {
      matrix[i] = []
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() - 0.5) * 2 * scale
      }
    }
    return matrix
  }

  // Convert feature set to input tensor
  private featuresToTensor(features: FeatureSet[]): number[][] {
    const tensor: number[][] = []
    
    for (const featureSet of features) {
      const flatFeatures: number[] = []
      
      // Flatten all feature categories into a single vector
      // Technical features
      flatFeatures.push(
        ...Object.values(featureSet.technical.priceFeatures).filter(v => typeof v === 'number'),
        ...Object.values(featureSet.technical.movingAverages),
        ...Object.values(featureSet.technical.oscillators),
        ...Object.values(featureSet.technical.volatilityIndicators),
        ...Object.values(featureSet.technical.volumeIndicators),
        ...Object.values(featureSet.technical.trendIndicators)
      )
      
      // Statistical features
      flatFeatures.push(
        ...Object.values(featureSet.statistical.descriptive),
        ...Object.values(featureSet.statistical.distribution),
        ...Object.values(featureSet.statistical.correlation).filter(v => typeof v === 'number'),
        ...Object.values(featureSet.statistical.timeSeries).filter(v => typeof v === 'number')
      )
      
      // Temporal features
      flatFeatures.push(
        ...Object.values(featureSet.temporal.cyclical).filter(v => typeof v === 'number'),
        ...Object.values(featureSet.temporal.seasonal),
        ...Object.values(featureSet.temporal.timeDecay)
      )
      
      // Market features
      flatFeatures.push(
        ...Object.values(featureSet.market.microstructure),
        ...Object.values(featureSet.market.regime),
        ...Object.values(featureSet.market.crossAsset)
      )
      
      // Sentiment features
      flatFeatures.push(
        ...Object.values(featureSet.sentiment.news),
        ...Object.values(featureSet.sentiment.social),
        ...Object.values(featureSet.sentiment.market)
      )
      
      // Macroeconomic features
      flatFeatures.push(
        ...Object.values(featureSet.macroeconomic.economic),
        ...Object.values(featureSet.macroeconomic.monetary),
        ...Object.values(featureSet.macroeconomic.geopolitical)
      )
      
      // Handle NaN and infinite values
      const cleanFeatures = flatFeatures.map(f => {
        if (isNaN(f) || !isFinite(f)) return 0
        return f
      })
      
      // Pad or truncate to match expected feature dimension
      while (cleanFeatures.length < this.config.featureDimension) {
        cleanFeatures.push(0)
      }
      cleanFeatures.length = this.config.featureDimension
      
      tensor.push(cleanFeatures)
    }
    
    return tensor
  }

  // Forward pass through the transformer
  forward(
    features: FeatureSet[],
    training: boolean = false
  ): { prediction: number, attentionWeights: AttentionWeights[], hiddenStates: number[][] } {
    this.isTraining = training
    
    // Convert features to tensor
    let input = this.featuresToTensor(features)
    
    // Ensure we have the right sequence length
    while (input.length < this.config.sequenceLength) {
      input.unshift(new Array(this.config.featureDimension).fill(0))
    }
    input = input.slice(-this.config.sequenceLength)
    
    // Project input to hidden dimension
    let hidden = MatrixOps.multiply(input, this.inputProjection)
    
    // Add positional encoding
    hidden = this.positionalEncoding.addToInput(hidden)
    
    // Pass through transformer layers
    const allAttentionWeights: AttentionWeights[] = []
    
    for (const layer of this.layers) {
      const { output, attentionWeights } = layer.forward(
        hidden,
        undefined, // No mask for now
        this.config.dropoutRate,
        training
      )
      hidden = output
      allAttentionWeights.push(...attentionWeights)
    }
    
    // Global average pooling over sequence dimension
    const pooled: number[] = new Array(this.config.hiddenDimension).fill(0)
    for (let i = 0; i < hidden.length; i++) {
      for (let j = 0; j < hidden[i].length; j++) {
        pooled[j] += hidden[i][j] / hidden.length
      }
    }
    
    // Project to output
    let prediction = 0
    for (let i = 0; i < pooled.length; i++) {
      prediction += pooled[i] * this.outputProjection[i][0]
    }
    
    return {
      prediction,
      attentionWeights: allAttentionWeights,
      hiddenStates: hidden
    }
  }

  // Make prediction with confidence and interpretability
  predict(features: FeatureSet[]): TransformerPrediction {
    const { prediction, attentionWeights, hiddenStates } = this.forward(features, false)
    
    // Calculate confidence based on attention entropy
    const confidence = this.calculateConfidence(attentionWeights)
    
    // Calculate feature importance
    const featureImportance = this.calculateFeatureImportance(attentionWeights, features)
    
    // Determine signal
    const signal = this.determineSignal(prediction, confidence)
    
    // Calculate price targets with uncertainty
    const priceTarget = this.calculatePriceTarget(prediction, confidence)
    
    // Generate reasoning
    const reasoning = this.generateReasoning(prediction, confidence, featureImportance, signal)
    
    return {
      prediction,
      confidence,
      priceTarget,
      signal,
      attentionWeights,
      featureImportance,
      reasoning
    }
  }

  private calculateConfidence(attentionWeights: AttentionWeights[]): number {
    if (attentionWeights.length === 0) return 0.5
    
    let totalEntropy = 0
    let count = 0
    
    for (const aw of attentionWeights) {
      for (const weights of aw.weights) {
        // Calculate entropy of attention distribution
        let entropy = 0
        for (const weight of weights) {
          if (weight > 0) {
            entropy -= weight * Math.log2(weight)
          }
        }
        totalEntropy += entropy
        count++
      }
    }
    
    const avgEntropy = totalEntropy / count
    const maxEntropy = Math.log2(this.config.sequenceLength)
    
    // Lower entropy = higher confidence
    return Math.max(0, Math.min(1, 1 - (avgEntropy / maxEntropy)))
  }

  private calculateFeatureImportance(
    attentionWeights: AttentionWeights[],
    features: FeatureSet[]
  ): { [key: string]: number } {
    const importance: { [key: string]: number } = {
      'technical': 0,
      'statistical': 0,
      'temporal': 0,
      'market': 0,
      'sentiment': 0,
      'macroeconomic': 0
    }
    
    // Simplified feature importance based on attention weights
    // In practice, this would be more sophisticated
    if (attentionWeights.length > 0) {
      const lastLayerWeights = attentionWeights.filter(aw => 
        aw.layerIndex === this.config.numLayers - 1
      )
      
      if (lastLayerWeights.length > 0) {
        const avgWeights = lastLayerWeights[0].weights[lastLayerWeights[0].weights.length - 1]
        
        // Assign weights to feature categories based on sequence positions
        const categories = Object.keys(importance)
        const weightsPerCategory = Math.floor(avgWeights.length / categories.length)
        
        categories.forEach((category, index) => {
          const startIdx = index * weightsPerCategory
          const endIdx = Math.min(startIdx + weightsPerCategory, avgWeights.length)
          
          let categoryWeight = 0
          for (let i = startIdx; i < endIdx; i++) {
            categoryWeight += avgWeights[i] || 0
          }
          
          importance[category] = categoryWeight / weightsPerCategory
        })
      }
    }
    
    return importance
  }

  private determineSignal(prediction: number, confidence: number): 'BUY' | 'SELL' | 'HOLD' {
    const threshold = 0.02 // 2% threshold
    const minConfidence = 0.6
    
    if (confidence < minConfidence) return 'HOLD'
    
    if (prediction > threshold) return 'BUY'
    if (prediction < -threshold) return 'SELL'
    return 'HOLD'
  }

  private calculatePriceTarget(prediction: number, confidence: number): { target: number; upper: number; lower: number } {
    // Assuming prediction is a percentage change
    const basePrice = 100 // This would be the current price in practice
    const target = basePrice * (1 + prediction)
    
    // Uncertainty bands based on confidence
    const uncertainty = (1 - confidence) * 0.1 // Max 10% uncertainty
    const upper = target * (1 + uncertainty)
    const lower = target * (1 - uncertainty)
    
    return { target, upper, lower }
  }

  private generateReasoning(
    prediction: number,
    confidence: number,
    featureImportance: { [key: string]: number },
    signal: 'BUY' | 'SELL' | 'HOLD'
  ): string {
    const predictionPercent = (prediction * 100).toFixed(2)
    const confidencePercent = (confidence * 100).toFixed(1)
    
    // Find most important feature category
    const mostImportant = Object.entries(featureImportance)
      .sort(([,a], [,b]) => b - a)[0]
    
    let reasoning = `Transformer model predicts ${predictionPercent}% price movement with ${confidencePercent}% confidence. `
    reasoning += `Signal: ${signal}. `
    reasoning += `Primary factors: ${mostImportant[0]} features (${(mostImportant[1] * 100).toFixed(1)}% importance). `
    
    if (confidence < 0.6) {
      reasoning += "Low confidence suggests high market uncertainty or conflicting signals."
    } else if (confidence > 0.8) {
      reasoning += "High confidence indicates strong consensus across multiple indicators."
    }
    
    return reasoning
  }

  // Training method (simplified)
  async train(
    trainingData: { features: FeatureSet[], target: number }[],
    validationData: { features: FeatureSet[], target: number }[]
  ): Promise<TrainingMetrics[]> {
    console.log('Starting Transformer training...')
    
    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      let totalLoss = 0
      let correct = 0
      
      // Training phase
      for (const sample of trainingData) {
        const { prediction } = this.forward(sample.features, true)
        
        // Calculate loss (MSE for regression)
        const loss = Math.pow(prediction - sample.target, 2)
        totalLoss += loss
        
        // Simple accuracy metric (within 5% of target)
        if (Math.abs(prediction - sample.target) < 0.05) {
          correct++
        }
        
        // Backpropagation would go here in a real implementation
        // For now, we'll simulate training progress
      }
      
      // Validation phase
      let validationLoss = 0
      let validationCorrect = 0
      
      for (const sample of validationData) {
        const { prediction } = this.forward(sample.features, false)
        const loss = Math.pow(prediction - sample.target, 2)
        validationLoss += loss
        
        if (Math.abs(prediction - sample.target) < 0.05) {
          validationCorrect++
        }
      }
      
      const metrics: TrainingMetrics = {
        epoch: epoch + 1,
        loss: totalLoss / trainingData.length,
        accuracy: correct / trainingData.length,
        validationLoss: validationLoss / validationData.length,
        validationAccuracy: validationCorrect / validationData.length,
        learningRate: this.config.learningRate
      }
      
      this.trainingHistory.push(metrics)
      
      if (epoch % 10 === 0) {
        console.log(`Epoch ${epoch + 1}/${this.config.epochs}: Loss=${metrics.loss.toFixed(4)}, Acc=${(metrics.accuracy * 100).toFixed(1)}%`)
      }
    }
    
    console.log('Training completed!')
    return this.trainingHistory
  }

  // Get model configuration
  getConfig(): TransformerConfig {
    return { ...this.config }
  }

  // Get training history
  getTrainingHistory(): TrainingMetrics[] {
    return [...this.trainingHistory]
  }

  // Save model state (simplified)
  saveModel(): string {
    return JSON.stringify({
      config: this.config,
      trainingHistory: this.trainingHistory,
      // In a real implementation, we'd save all the learned weights
    })
  }

  // Load model state (simplified)
  static loadModel(modelData: string): TransformerModel {
    const data = JSON.parse(modelData)
    const model = new TransformerModel(data.config)
    model.trainingHistory = data.trainingHistory || []
    // In a real implementation, we'd load all the learned weights
    return model
  }
}

// Factory function to create transformer with default config
function createTransformerModel(overrides: Partial<TransformerConfig> = {}): TransformerModel {
  const defaultConfig: TransformerConfig = {
    sequenceLength: 60, // 60 time steps
    featureDimension: 100, // Will be adjusted based on actual features
    hiddenDimension: 256,
    numHeads: 8,
    numLayers: 6,
    dropoutRate: 0.1,
    learningRate: 0.0001,
    batchSize: 32,
    epochs: 100
  }
  
  const config = { ...defaultConfig, ...overrides }
  return new TransformerModel(config)
}

export {
  TransformerModel,
  createTransformerModel,
  type TransformerConfig,
  type TransformerPrediction,
  type AttentionWeights,
  type TrainingMetrics
}