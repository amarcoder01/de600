#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🐍 Installing Python dependencies using pip..."

# Check if we're in a Render environment
if [ "$RENDER" = "true" ]; then
    echo "📦 Render environment detected, installing Python dependencies..."
    
    # Install Python dependencies using pip with specific versions
    echo "📦 Installing yfinance and dependencies..."
    
    # Install core dependencies first
    pip install --user --no-cache-dir \
        requests==2.31.0 \
        pandas==2.1.4 \
        numpy==1.24.3
    
    # Install yfinance with retry logic
    echo "🔄 Installing yfinance..."
    for i in {1..3}; do
        if pip install --user --no-cache-dir yfinance==0.2.28; then
            echo "✅ yfinance installed successfully on attempt $i"
            break
        else
            echo "⚠️ yfinance installation failed on attempt $i"
            if [ $i -eq 3 ]; then
                echo "❌ yfinance installation failed after 3 attempts"
            fi
        fi
    done
    
    # Install remaining dependencies
    pip install --user --no-cache-dir \
        scikit-learn==1.3.0 \
        matplotlib==3.7.2 \
        seaborn==0.12.2 \
        plotly==5.17.0
    
    echo "✅ Python dependencies installation completed"
    
    # Test yfinance installation with better error handling
    echo "🧪 Testing yfinance installation..."
    if python3 -c "import yfinance; print('✅ yfinance import successful')" 2>/dev/null; then
        echo "✅ yfinance is working correctly"
    else
        echo "⚠️ yfinance import failed, but continuing with fallback"
        # Try alternative installation method
        echo "🔄 Trying alternative installation with different approach..."
        pip install --user --no-cache-dir --force-reinstall --no-deps yfinance==0.2.28
        pip install --user --no-cache-dir lxml html5lib beautifulsoup4
    fi
else
    echo "⏭️ Skipping Python dependency installation (not in Render environment)"
fi
