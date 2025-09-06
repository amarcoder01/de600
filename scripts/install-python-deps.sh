#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🐍 Installing Python dependencies using pip..."

# Check if we're in a Render environment
if [ "$RENDER" = "true" ]; then
    echo "📦 Render environment detected, installing Python dependencies..."
    
    # Install Python dependencies using pip with specific versions
    echo "📦 Installing yfinance and dependencies..."
    pip install --user --no-cache-dir \
        yfinance==0.2.28 \
        requests==2.31.0 \
        pandas==2.1.4 \
        numpy==1.24.3 \
        scikit-learn==1.3.0 \
        matplotlib==3.7.2 \
        seaborn==0.12.2 \
        plotly==5.17.0
    
    echo "✅ Python dependencies installed successfully"
    
    # Test yfinance installation with better error handling
    echo "🧪 Testing yfinance installation..."
    if python3 -c "import yfinance; print('✅ yfinance import successful')" 2>/dev/null; then
        echo "✅ yfinance is working correctly"
    else
        echo "⚠️ yfinance import failed, but continuing with fallback"
        # Try alternative installation method
        echo "🔄 Trying alternative installation..."
        pip install --user --no-cache-dir --force-reinstall yfinance==0.2.28
    fi
else
    echo "⏭️ Skipping Python dependency installation (not in Render environment)"
fi
