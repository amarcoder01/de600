#!/bin/bash

# Install Python dependencies for Render deployment
echo "🐍 Installing Python dependencies..."

# Check if we're in a Render environment
if [ "$RENDER" = "true" ]; then
    echo "📦 Render environment detected, installing Python dependencies..."
    
    # Install Python dependencies using pip
    pip install --user yfinance==0.2.28 requests==2.31.0 pandas==2.1.4 numpy==1.24.3 scikit-learn==1.3.0 matplotlib==3.7.2 seaborn==0.12.2 plotly==5.17.0
    
    echo "✅ Python dependencies installed successfully"
else
    echo "⏭️ Skipping Python dependency installation (not in Render environment)"
fi
