#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🐍 Installing Python dependencies using pip..."

# Check if we're in a Render environment or if requirements file exists
if [ "$RENDER" = "true" ] || [ -f "requirements-python.txt" ]; then
    echo "📦 Installing Python dependencies from requirements-python.txt..."
    
    # Check if Python is available
    if command -v python3 &> /dev/null; then
        echo "✅ Python3 found: $(python3 --version)"
    else
        echo "❌ Python3 not found, skipping Python dependencies"
        exit 0
    fi
    
    # Install dependencies from requirements file
    echo "📦 Installing dependencies from requirements-python.txt..."
    if pip install --user --no-cache-dir -r requirements-python.txt; then
        echo "✅ Python dependencies installed successfully"
    else
        echo "⚠️ Failed to install from requirements file, trying individual packages..."
        
        # Fallback: install core packages individually
        pip install --user --no-cache-dir yfinance==0.2.28 || echo "⚠️ yfinance installation failed"
        pip install --user --no-cache-dir requests==2.31.0 || echo "⚠️ requests installation failed"
        pip install --user --no-cache-dir pandas==2.1.4 || echo "⚠️ pandas installation failed"
        pip install --user --no-cache-dir numpy==1.24.3 || echo "⚠️ numpy installation failed"
    fi
    
    # Test yfinance installation
    echo "🧪 Testing yfinance installation..."
    if python3 -c "import yfinance; print('✅ yfinance import successful')" 2>/dev/null; then
        echo "✅ yfinance is working correctly"
    else
        echo "⚠️ yfinance import failed, but continuing with fallback"
        # Try alternative installation method
        echo "🔄 Trying alternative installation..."
        pip install --user --no-cache-dir --force-reinstall yfinance==0.2.28 || echo "⚠️ Alternative yfinance installation failed"
    fi
else
    echo "⏭️ Skipping Python dependency installation (not in Render environment and no requirements file)"
fi
