// Import types - using any for now to avoid circular dependencies
type FeatureSet = any;
type TransformerModel = any;
type TransformerPrediction = any;

// Mock createTransformerModel function
const createTransformerModel = (config: any): any => {
  return {
    predict: (features: any) => ({
      prediction: 0.5,
      confidence: 0.8,
      attention: [],
      reasoning: 'Mock transformer prediction'
    })
  };
};

// VAE-LSTM-Transformer Ensemble interfaces
interface VAEConfig {
  inputDimension: number
  latentDimension: number
  encoderHiddenDimensions: number[]
  decoderHiddenDimensions: number[]
  learningRate: number
  betaVAE: number // Beta parameter for VAE loss weighting
}

interface LSTMConfig {
  inputSize: number
  hiddenSize: number
  numLayers: number
  sequenceLength: number
  dropoutRate: number
  bidirectional: boolean
}

interface EnsembleConfig {
  vaeConfig: VAEConfig
  lstmConfig: LSTMConfig
  transformerConfig: any // Will use TransformerConfig from transformer-model
  ensembleWeights: {
    vae: number
    lstm: number
    transformer: number
  }
  adaptiveWeighting: boolean
  uncertaintyThreshold: number
  rebalanceFrequency: number
}

interface VAEOutput {
  reconstruction: number[]
  mean: number[]
  logVariance: number[]
  latentSample: number[]
  klDivergence: number
  reconstructionLoss: number
}

interface LSTMOutput {
  prediction: number
  hiddenStates: number[][]
  cellStates: number[][]
  confidence: number
}

interface EnsemblePrediction {
  finalPrediction: number
  confidence: number
  uncertainty: number
  modelContributions: {
    vae: { prediction: number; weight: number; confidence: number }
    lstm: { prediction: number; weight: number; confidence: number }
    transformer: { prediction: number; weight: number; confidence: number }
  }
  latentRepresentation: number[]
  signal: 'BUY' | 'SELL' | 'HOLD'
  priceTarget: {
    target: number
    upper: number
    lower: number
  }
  reasoning: string
  modelWeights: {
    vae: number
    lstm: number
    transformer: number
  }
}

interface PerformanceMetrics {
  accuracy: number
  mse: number
  mae: number
  sharpeRatio: number
  maxDrawdown: number
  hitRate: number
  profitFactor: number
  timestamp: number
}

// Utility functions for neural network operations
class NeuralUtils {
  static sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))))
  }

  static tanh(x: number): number {
    return Math.tanh(Math.max(-500, Math.min(500, x)))
  }

  static relu(x: number): number {
    return Math.max(0, x)
  }

  static leakyRelu(x: number, alpha: number = 0.01): number {
    return x > 0 ? x : alpha * x
  }

  static softplus(x: number): number {
    return Math.log(1 + Math.exp(Math.max(-500, Math.min(500, x))))
  }

  static gaussianSample(mean: number, variance: number): number {
    // Box-Muller transform for Gaussian sampling
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + Math.sqrt(variance) * z0
  }

  static klDivergence(mean: number[], logVar: number[]): number {
    let kl = 0
    for (let i = 0; i < mean.length; i++) {
      kl += 0.5 * (Math.exp(logVar[i]) + mean[i] * mean[i] - 1 - logVar[i])
    }
    return kl
  }

  static mse(predicted: number[], actual: number[]): number {
    let sum = 0
    for (let i = 0; i < predicted.length; i++) {
      sum += Math.pow(predicted[i] - actual[i], 2)
    }
    return sum / predicted.length
  }

  static initializeWeights(rows: number, cols: number, method: 'xavier' | 'he' = 'xavier'): number[][] {
    const weights: number[][] = []
    const scale = method === 'xavier' 
      ? Math.sqrt(2.0 / (rows + cols))
      : Math.sqrt(2.0 / rows)
    
    for (let i = 0; i < rows; i++) {
      weights[i] = []
      for (let j = 0; j < cols; j++) {
        weights[i][j] = (Math.random() - 0.5) * 2 * scale
      }
    }
    return weights
  }

  static matrixMultiply(a: number[][], b: number[][]): number[][] {
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

  static vectorAdd(a: number[], b: number[]): number[] {
    return a.map((val, i) => val + (b[i] || 0))
  }

  static dropout(values: number[], rate: number, training: boolean = true): number[] {
    if (!training) return values
    return values.map(val => Math.random() > rate ? val / (1 - rate) : 0)
  }
}

// Variational Autoencoder implementation
class VariationalAutoencoder {
  private config: VAEConfig
  private encoderWeights: number[][][] = []
  private encoderBiases: number[][] = []
  private decoderWeights: number[][][] = []
  private decoderBiases: number[][] = []
  private meanLayer: number[][] = []
  private logVarLayer: number[][] = []

  constructor(config: VAEConfig) {
    this.config = config
    this.initializeNetworks()
  }

  private initializeNetworks(): void {
    // Initialize encoder
    this.encoderWeights = []
    this.encoderBiases = []
    
    let prevSize = this.config.inputDimension
    for (const hiddenSize of this.config.encoderHiddenDimensions) {
      this.encoderWeights.push(NeuralUtils.initializeWeights(prevSize, hiddenSize, 'he'))
      this.encoderBiases.push(new Array(hiddenSize).fill(0))
      prevSize = hiddenSize
    }

    // Mean and log variance layers
    const lastHiddenSize = this.config.encoderHiddenDimensions[this.config.encoderHiddenDimensions.length - 1]
    this.meanLayer = NeuralUtils.initializeWeights(lastHiddenSize, this.config.latentDimension)
    this.logVarLayer = NeuralUtils.initializeWeights(lastHiddenSize, this.config.latentDimension)

    // Initialize decoder
    this.decoderWeights = []
    this.decoderBiases = []
    
    prevSize = this.config.latentDimension
    for (const hiddenSize of this.config.decoderHiddenDimensions) {
      this.decoderWeights.push(NeuralUtils.initializeWeights(prevSize, hiddenSize, 'he'))
      this.decoderBiases.push(new Array(hiddenSize).fill(0))
      prevSize = hiddenSize
    }
    
    // Final output layer
    this.decoderWeights.push(NeuralUtils.initializeWeights(prevSize, this.config.inputDimension))
    this.decoderBiases.push(new Array(this.config.inputDimension).fill(0))
  }

  private encode(input: number[]): { mean: number[], logVar: number[], hidden: number[] } {
    let hidden = [...input]
    
    // Forward through encoder layers
    for (let i = 0; i < this.encoderWeights.length; i++) {
      const weights = this.encoderWeights[i]
      const biases = this.encoderBiases[i]
      
      const newHidden: number[] = []
      for (let j = 0; j < weights[0].length; j++) {
        let sum = biases[j]
        for (let k = 0; k < hidden.length; k++) {
          sum += hidden[k] * weights[k][j]
        }
        newHidden[j] = NeuralUtils.leakyRelu(sum)
      }
      hidden = newHidden
    }

    // Compute mean and log variance
    const mean: number[] = []
    const logVar: number[] = []
    
    for (let i = 0; i < this.config.latentDimension; i++) {
      let meanSum = 0
      let logVarSum = 0
      
      for (let j = 0; j < hidden.length; j++) {
        meanSum += hidden[j] * this.meanLayer[j][i]
        logVarSum += hidden[j] * this.logVarLayer[j][i]
      }
      
      mean[i] = meanSum
      logVar[i] = logVarSum
    }

    return { mean, logVar, hidden }
  }

  private reparameterize(mean: number[], logVar: number[]): number[] {
    const latentSample: number[] = []
    
    for (let i = 0; i < mean.length; i++) {
      const variance = Math.exp(logVar[i])
      latentSample[i] = NeuralUtils.gaussianSample(mean[i], variance)
    }
    
    return latentSample
  }

  private decode(latentSample: number[]): number[] {
    let hidden = [...latentSample]
    
    // Forward through decoder layers
    for (let i = 0; i < this.decoderWeights.length; i++) {
      const weights = this.decoderWeights[i]
      const biases = this.decoderBiases[i]
      
      const newHidden: number[] = []
      for (let j = 0; j < weights[0].length; j++) {
        let sum = biases[j]
        for (let k = 0; k < hidden.length; k++) {
          sum += hidden[k] * weights[k][j]
        }
        
        // Use sigmoid for final layer, leaky ReLU for hidden layers
        const activation = i === this.decoderWeights.length - 1 
          ? NeuralUtils.sigmoid(sum)
          : NeuralUtils.leakyRelu(sum)
        
        newHidden[j] = activation
      }
      hidden = newHidden
    }

    return hidden
  }

  forward(input: number[]): VAEOutput {
    const { mean, logVar, hidden } = this.encode(input)
    const latentSample = this.reparameterize(mean, logVar)
    const reconstruction = this.decode(latentSample)
    
    const klDivergence = NeuralUtils.klDivergence(mean, logVar)
    const reconstructionLoss = NeuralUtils.mse(reconstruction, input)
    
    return {
      reconstruction,
      mean,
      logVariance: logVar,
      latentSample,
      klDivergence,
      reconstructionLoss
    }
  }

  // Extract latent representation for ensemble
  getLatentRepresentation(input: number[]): number[] {
    const { mean } = this.encode(input)
    return mean
  }

  // Calculate anomaly score based on reconstruction error
  getAnomalyScore(input: number[]): number {
    const { reconstructionLoss } = this.forward(input)
    return reconstructionLoss
  }
}

// LSTM implementation
class LSTMNetwork {
  private config: LSTMConfig
  private weights: {
    input: number[][][][]
    hidden: number[][][][]
    bias: number[][][]
    output: number[][]
    outputBias: number[]
  } = {
    input: [],
    hidden: [],
    bias: [],
    output: [],
    outputBias: []
  }

  constructor(config: LSTMConfig) {
    this.config = config
    this.initializeWeights()
  }

  private initializeWeights(): void {
    const { inputSize, hiddenSize, numLayers } = this.config
    
    this.weights = {
      input: [],
      hidden: [],
      bias: [],
      output: NeuralUtils.initializeWeights(hiddenSize, 1),
      outputBias: [0]
    }

    for (let layer = 0; layer < numLayers; layer++) {
      const inputDim = layer === 0 ? inputSize : hiddenSize
      
      // LSTM gates: forget, input, candidate, output (4 gates)
      this.weights.input[layer] = []
      this.weights.hidden[layer] = []
      this.weights.bias[layer] = []
      
      for (let gate = 0; gate < 4; gate++) {
        this.weights.input[layer][gate] = NeuralUtils.initializeWeights(inputDim, hiddenSize)
        this.weights.hidden[layer][gate] = NeuralUtils.initializeWeights(hiddenSize, hiddenSize)
        this.weights.bias[layer][gate] = Array.from({ length: hiddenSize }, () => 0)
      }
    }
  }

  private lstmCell(
    input: number[],
    prevHidden: number[],
    prevCell: number[],
    layer: number
  ): { hidden: number[], cell: number[] } {
    const hiddenSize = this.config.hiddenSize
    const gates = {
      forget: new Array(hiddenSize).fill(0),
      input: new Array(hiddenSize).fill(0),
      candidate: new Array(hiddenSize).fill(0),
      output: new Array(hiddenSize).fill(0)
    }

    // Compute gates
    for (let gate = 0; gate < 4; gate++) {
      const gateNames = ['forget', 'input', 'candidate', 'output'] as const
      const gateName = gateNames[gate]
      
      for (let i = 0; i < hiddenSize; i++) {
        let sum = this.weights.bias[layer]?.[gate]?.[i] || 0
        
        // Input contribution
        for (let j = 0; j < input.length; j++) {
          const inputWeight = this.weights.input[layer]?.[gate]?.[j]?.[i]
          if (typeof inputWeight === 'number') {
            sum += input[j] * inputWeight
          }
        }
        
        // Hidden state contribution
        for (let j = 0; j < hiddenSize; j++) {
          const hiddenWeight = this.weights.hidden[layer]?.[gate]?.[j]?.[i]
          if (typeof hiddenWeight === 'number') {
            sum += prevHidden[j] * hiddenWeight
          }
        }
        
        // Apply activation
        if (gateName === 'candidate') {
          gates[gateName][i] = NeuralUtils.tanh(sum)
        } else {
          gates[gateName][i] = NeuralUtils.sigmoid(sum)
        }
      }
    }

    // Update cell state
    const newCell: number[] = []
    for (let i = 0; i < hiddenSize; i++) {
      newCell[i] = gates.forget[i] * prevCell[i] + gates.input[i] * gates.candidate[i]
    }

    // Update hidden state
    const newHidden: number[] = []
    for (let i = 0; i < hiddenSize; i++) {
      newHidden[i] = gates.output[i] * NeuralUtils.tanh(newCell[i])
    }

    return { hidden: newHidden, cell: newCell }
  }

  forward(sequence: number[][]): LSTMOutput {
    const { numLayers, hiddenSize, dropoutRate } = this.config
    const seqLength = sequence.length
    
    // Initialize states
    let hiddenStates: number[][][] = []
    let cellStates: number[][][] = []
    
    for (let layer = 0; layer < numLayers; layer++) {
      hiddenStates[layer] = []
      cellStates[layer] = []
      
      for (let t = 0; t <= seqLength; t++) {
        hiddenStates[layer][t] = new Array(hiddenSize).fill(0)
        cellStates[layer][t] = new Array(hiddenSize).fill(0)
      }
    }

    // Forward pass through time
    for (let t = 0; t < seqLength; t++) {
      let layerInput = sequence[t]
      
      for (let layer = 0; layer < numLayers; layer++) {
        const { hidden, cell } = this.lstmCell(
          layerInput,
          hiddenStates[layer][t],
          cellStates[layer][t],
          layer
        )
        
        hiddenStates[layer][t + 1] = hidden
        cellStates[layer][t + 1] = cell
        
        // Apply dropout between layers
        layerInput = NeuralUtils.dropout(hidden, dropoutRate, true)
      }
    }

    // Final prediction from last hidden state
    const finalHidden = hiddenStates[numLayers - 1][seqLength]
    let prediction = this.weights.outputBias[0]
    
    for (let i = 0; i < hiddenSize; i++) {
      prediction += finalHidden[i] * this.weights.output[i][0]
    }

    // Calculate confidence based on hidden state variance
    const hiddenVariance = this.calculateHiddenVariance(hiddenStates[numLayers - 1])
    const confidence = Math.max(0, Math.min(1, 1 - hiddenVariance))

    return {
      prediction,
      hiddenStates: hiddenStates[numLayers - 1],
      cellStates: cellStates[numLayers - 1],
      confidence
    }
  }

  private calculateHiddenVariance(hiddenStates: number[][]): number {
    if (hiddenStates.length === 0) return 1
    
    const lastStates = hiddenStates.slice(-5) // Last 5 time steps
    const means = new Array(this.config.hiddenSize).fill(0)
    
    // Calculate means
    for (const state of lastStates) {
      for (let i = 0; i < state.length; i++) {
        means[i] += state[i] / lastStates.length
      }
    }
    
    // Calculate variance
    let totalVariance = 0
    for (const state of lastStates) {
      for (let i = 0; i < state.length; i++) {
        totalVariance += Math.pow(state[i] - means[i], 2)
      }
    }
    
    return totalVariance / (lastStates.length * this.config.hiddenSize)
  }
}

// Main VAE-LSTM-Transformer Ensemble
class VAELSTMTransformerEnsemble {
  private config: EnsembleConfig
  private vae: VariationalAutoencoder
  private lstm: LSTMNetwork
  private transformer: TransformerModel
  private performanceHistory: PerformanceMetrics[]
  private currentWeights: { vae: number; lstm: number; transformer: number }
  private predictionCount: number

  constructor(config: EnsembleConfig) {
    this.config = config
    this.performanceHistory = []
    this.currentWeights = { ...config.ensembleWeights }
    this.predictionCount = 0
    
    // Initialize models
    this.vae = new VariationalAutoencoder(config.vaeConfig)
    this.lstm = new LSTMNetwork(config.lstmConfig)
    this.transformer = createTransformerModel(config.transformerConfig)
  }

  // Convert features to different input formats for each model
  private prepareInputs(features: FeatureSet[]): {
    vaeInput: number[]
    lstmInput: number[][]
    transformerInput: FeatureSet[]
  } {
    // For VAE: flatten latest features
    const latestFeatures = features[features.length - 1]
    const vaeInput = this.flattenFeatures(latestFeatures)
    
    // For LSTM: sequence of flattened features
    const lstmInput = features.map(f => this.flattenFeatures(f))
    
    // For Transformer: use features as-is
    const transformerInput = features
    
    return { vaeInput, lstmInput, transformerInput }
  }

  private flattenFeatures(features: FeatureSet): number[] {
    const flattened: number[] = []
    
    // Technical features
    flattened.push(
      ...Object.values(features.technical.priceFeatures).filter(v => typeof v === 'number'),
      ...Object.values(features.technical.movingAverages || {}).filter((v): v is number => typeof v === 'number'),
      ...Object.values(features.technical.oscillators).filter((v): v is number => typeof v === 'number'),
      ...Object.values(features.technical.volatilityIndicators).filter((v): v is number => typeof v === 'number'),
      ...Object.values(features.technical.volumeIndicators).filter((v): v is number => typeof v === 'number'),
      ...Object.values(features.technical.trendIndicators).filter((v): v is number => typeof v === 'number')
    )
    
    // Statistical features
    flattened.push(
      ...Object.values(features.statistical.descriptive || {}).filter((v): v is number => typeof v === 'number'),
      ...Object.values(features.statistical.distribution).filter((v): v is number => typeof v === 'number'),
      ...Object.values(features.statistical.correlation).filter(v => typeof v === 'number'),
      ...Object.values(features.statistical.timeSeries).filter(v => typeof v === 'number')
    )
    
    // Market features
    flattened.push(
      ...Object.values(features.market.microstructure || {}).filter((v): v is number => typeof v === 'number'),
      ...Object.values(features.market.regime).filter((v): v is number => typeof v === 'number'),
      ...Object.values(features.market.crossAsset).filter((v): v is number => typeof v === 'number')
    )
    
    // Clean and normalize
    return flattened.map(v => {
      if (isNaN(v) || !isFinite(v)) return 0
      return Math.max(-10, Math.min(10, v)) // Clip extreme values
    })
  }

  // Make ensemble prediction
  predict(features: FeatureSet[]): EnsemblePrediction {
    const { vaeInput, lstmInput, transformerInput } = this.prepareInputs(features)
    
    // Get predictions from each model
    const vaeOutput = this.vae.forward(vaeInput)
    const lstmOutput = this.lstm.forward(lstmInput)
    const transformerOutput = this.transformer.predict(transformerInput)
    
    // Extract individual predictions
    const vaePrediction = this.extractVAEPrediction(vaeOutput)
    const lstmPrediction = lstmOutput.prediction
    const transformerPrediction = transformerOutput.prediction
    
    // Calculate individual confidences
    const vaeConfidence = this.calculateVAEConfidence(vaeOutput)
    const lstmConfidence = lstmOutput.confidence
    const transformerConfidence = transformerOutput.confidence
    
    // Update weights if adaptive weighting is enabled
    if (this.config.adaptiveWeighting) {
      this.updateAdaptiveWeights({
        vae: { prediction: vaePrediction, confidence: vaeConfidence },
        lstm: { prediction: lstmPrediction, confidence: lstmConfidence },
        transformer: { prediction: transformerPrediction, confidence: transformerConfidence }
      })
    }
    
    // Combine predictions using weighted average
    const finalPrediction = 
      this.currentWeights.vae * vaePrediction +
      this.currentWeights.lstm * lstmPrediction +
      this.currentWeights.transformer * transformerPrediction
    
    // Calculate ensemble confidence
    const ensembleConfidence = this.calculateEnsembleConfidence({
      vae: vaeConfidence,
      lstm: lstmConfidence,
      transformer: transformerConfidence
    })
    
    // Calculate uncertainty
    const uncertainty = this.calculateUncertainty([
      vaePrediction,
      lstmPrediction,
      transformerPrediction
    ])
    
    // Determine signal
    const signal = this.determineSignal(finalPrediction, ensembleConfidence)
    
    // Calculate price targets
    const priceTarget = this.calculatePriceTarget(finalPrediction, uncertainty)
    
    // Generate reasoning
    const reasoning = this.generateReasoning({
      finalPrediction,
      confidence: ensembleConfidence,
      uncertainty,
      modelContributions: {
        vae: { prediction: vaePrediction, weight: this.currentWeights.vae, confidence: vaeConfidence },
        lstm: { prediction: lstmPrediction, weight: this.currentWeights.lstm, confidence: lstmConfidence },
        transformer: { prediction: transformerPrediction, weight: this.currentWeights.transformer, confidence: transformerConfidence }
      }
    })
    
    this.predictionCount++
    
    return {
      finalPrediction,
      confidence: ensembleConfidence,
      uncertainty,
      modelContributions: {
        vae: { prediction: vaePrediction, weight: this.currentWeights.vae, confidence: vaeConfidence },
        lstm: { prediction: lstmPrediction, weight: this.currentWeights.lstm, confidence: lstmConfidence },
        transformer: { prediction: transformerPrediction, weight: this.currentWeights.transformer, confidence: transformerConfidence }
      },
      latentRepresentation: vaeOutput.latentSample,
      signal,
      priceTarget,
      reasoning,
      modelWeights: { ...this.currentWeights }
    }
  }

  private extractVAEPrediction(vaeOutput: VAEOutput): number {
    // Use the first component of latent representation as prediction
    // In practice, this would be learned through training
    return vaeOutput.latentSample[0] || 0
  }

  private calculateVAEConfidence(vaeOutput: VAEOutput): number {
    // Lower reconstruction loss = higher confidence
    const maxLoss = 1.0
    return Math.max(0, Math.min(1, 1 - (vaeOutput.reconstructionLoss / maxLoss)))
  }

  private calculateEnsembleConfidence(confidences: {
    vae: number
    lstm: number
    transformer: number
  }): number {
    // Weighted average of individual confidences
    return (
      this.currentWeights.vae * confidences.vae +
      this.currentWeights.lstm * confidences.lstm +
      this.currentWeights.transformer * confidences.transformer
    )
  }

  private calculateUncertainty(predictions: number[]): number {
    if (predictions.length === 0) return 1
    
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length
    const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / predictions.length
    
    return Math.sqrt(variance)
  }

  private updateAdaptiveWeights(modelOutputs: {
    vae: { prediction: number; confidence: number }
    lstm: { prediction: number; confidence: number }
    transformer: { prediction: number; confidence: number }
  }): void {
    // Update weights based on recent performance
    if (this.predictionCount % this.config.rebalanceFrequency === 0 && this.performanceHistory.length > 0) {
      const recentMetrics = this.performanceHistory.slice(-10) // Last 10 performance records
      
      if (recentMetrics.length > 0) {
        // Simple adaptive weighting based on accuracy
        const avgAccuracy = recentMetrics.reduce((sum, m) => sum + m.accuracy, 0) / recentMetrics.length
        
        // Adjust weights based on confidence and recent performance
        const confidenceSum = modelOutputs.vae.confidence + modelOutputs.lstm.confidence + modelOutputs.transformer.confidence
        
        if (confidenceSum > 0) {
          this.currentWeights.vae = (modelOutputs.vae.confidence / confidenceSum) * 0.7 + this.config.ensembleWeights.vae * 0.3
          this.currentWeights.lstm = (modelOutputs.lstm.confidence / confidenceSum) * 0.7 + this.config.ensembleWeights.lstm * 0.3
          this.currentWeights.transformer = (modelOutputs.transformer.confidence / confidenceSum) * 0.7 + this.config.ensembleWeights.transformer * 0.3
          
          // Normalize weights
          const weightSum = this.currentWeights.vae + this.currentWeights.lstm + this.currentWeights.transformer
          this.currentWeights.vae /= weightSum
          this.currentWeights.lstm /= weightSum
          this.currentWeights.transformer /= weightSum
        }
      }
    }
  }

  private determineSignal(prediction: number, confidence: number): 'BUY' | 'SELL' | 'HOLD' {
    const threshold = 0.02 // 2% threshold
    const minConfidence = 0.6
    
    if (confidence < minConfidence) return 'HOLD'
    
    if (prediction > threshold) return 'BUY'
    if (prediction < -threshold) return 'SELL'
    return 'HOLD'
  }

  private calculatePriceTarget(prediction: number, uncertainty: number): {
    target: number
    upper: number
    lower: number
  } {
    const basePrice = 100 // This would be the current price in practice
    const target = basePrice * (1 + prediction)
    
    // Uncertainty bands
    const uncertaintyMultiplier = Math.max(0.01, Math.min(0.2, uncertainty * 2))
    const upper = target * (1 + uncertaintyMultiplier)
    const lower = target * (1 - uncertaintyMultiplier)
    
    return { target, upper, lower }
  }

  private generateReasoning(data: {
    finalPrediction: number
    confidence: number
    uncertainty: number
    modelContributions: {
      vae: { prediction: number; weight: number; confidence: number }
      lstm: { prediction: number; weight: number; confidence: number }
      transformer: { prediction: number; weight: number; confidence: number }
    }
  }): string {
    const predictionPercent = (data.finalPrediction * 100).toFixed(2)
    const confidencePercent = (data.confidence * 100).toFixed(1)
    const uncertaintyPercent = (data.uncertainty * 100).toFixed(1)
    
    // Find dominant model
    const contributions = data.modelContributions
    const dominantModel = Object.entries(contributions)
      .sort(([,a], [,b]) => b.weight - a.weight)[0][0]
    
    let reasoning = `Ensemble prediction: ${predictionPercent}% price movement with ${confidencePercent}% confidence and ${uncertaintyPercent}% uncertainty. `
    reasoning += `Dominant model: ${dominantModel.toUpperCase()} (${(contributions[dominantModel as keyof typeof contributions].weight * 100).toFixed(1)}% weight). `
    
    // Model agreement analysis
    const predictions = [contributions.vae.prediction, contributions.lstm.prediction, contributions.transformer.prediction]
    const predictionRange = Math.max(...predictions) - Math.min(...predictions)
    
    if (predictionRange < 0.01) {
      reasoning += "Strong model consensus indicates high reliability. "
    } else if (predictionRange > 0.05) {
      reasoning += "Significant model disagreement suggests market uncertainty. "
    }
    
    // Confidence analysis
    if (data.confidence > 0.8) {
      reasoning += "High ensemble confidence supports the prediction."
    } else if (data.confidence < 0.5) {
      reasoning += "Low confidence suggests caution and potential market volatility."
    }
    
    return reasoning
  }

  // Update performance metrics
  updatePerformance(actualReturn: number, predictedReturn: number): void {
    const accuracy = Math.abs(actualReturn - predictedReturn) < 0.02 ? 1 : 0
    const mse = Math.pow(actualReturn - predictedReturn, 2)
    const mae = Math.abs(actualReturn - predictedReturn)
    
    const metrics: PerformanceMetrics = {
      accuracy,
      mse,
      mae,
      sharpeRatio: 0, // Would be calculated over a period
      maxDrawdown: 0, // Would be calculated over a period
      hitRate: 0, // Would be calculated over a period
      profitFactor: 0, // Would be calculated over a period
      timestamp: Date.now()
    }
    
    this.performanceHistory.push(metrics)
    
    // Keep only recent history
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000)
    }
  }

  // Get current model weights
  getCurrentWeights(): { vae: number; lstm: number; transformer: number } {
    return { ...this.currentWeights }
  }

  // Get performance history
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory]
  }

  // Get ensemble configuration
  getConfig(): EnsembleConfig {
    return { ...this.config }
  }
}

// Factory function to create ensemble with default configuration
function createVAELSTMTransformerEnsemble(overrides: Partial<EnsembleConfig> = {}): VAELSTMTransformerEnsemble {
  const defaultConfig: EnsembleConfig = {
    vaeConfig: {
      inputDimension: 50,
      latentDimension: 10,
      encoderHiddenDimensions: [32, 16],
      decoderHiddenDimensions: [16, 32],
      learningRate: 0.001,
      betaVAE: 1.0
    },
    lstmConfig: {
      inputSize: 50,
      hiddenSize: 64,
      numLayers: 2,
      sequenceLength: 60,
      dropoutRate: 0.2,
      bidirectional: false
    },
    transformerConfig: {
      sequenceLength: 60,
      featureDimension: 50,
      hiddenDimension: 128,
      numHeads: 4,
      numLayers: 3,
      dropoutRate: 0.1
    },
    ensembleWeights: {
      vae: 0.2,
      lstm: 0.3,
      transformer: 0.5
    },
    adaptiveWeighting: true,
    uncertaintyThreshold: 0.1,
    rebalanceFrequency: 10
  }
  
  const config = { ...defaultConfig, ...overrides }
  return new VAELSTMTransformerEnsemble(config)
}

export {
  VAELSTMTransformerEnsemble,
  createVAELSTMTransformerEnsemble,
  type EnsembleConfig,
  type EnsemblePrediction,
  type PerformanceMetrics,
  type VAEConfig,
  type LSTMConfig
}