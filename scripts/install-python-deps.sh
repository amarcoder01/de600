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
    
    # Determine pip command (prefer python3 -m pip)
    if python3 -m pip --version >/dev/null 2>&1; then
        PIP_CMD="python3 -m pip"
    elif command -v pip3 >/dev/null 2>&1; then
        PIP_CMD="pip3"
    elif command -v pip >/dev/null 2>&1; then
        PIP_CMD="pip"
    else
        echo "❌ No pip installer found for Python3"
        exit 1
    fi
    
    # Install dependencies from requirements file
    echo "📦 Installing dependencies from requirements-python.txt..."
    if $PIP_CMD install --no-cache-dir -r requirements-python.txt; then
        echo "✅ Python dependencies installed successfully"
    else
        echo "⚠️ Failed to install from requirements file, trying individual packages..."
        
        # Fallback: install core packages individually with flexible versions
        $PIP_CMD install --no-cache-dir yfinance==0.2.28 || echo "⚠️ yfinance installation failed"
        $PIP_CMD install --no-cache-dir "requests>=2.31.0" || echo "⚠️ requests installation failed"
        $PIP_CMD install --no-cache-dir "pandas>=2.0.0" || echo "⚠️ pandas installation failed"
        $PIP_CMD install --no-cache-dir "numpy>=1.24.0" || echo "⚠️ numpy installation failed"
    fi
    
    # Test key dependencies installation
    echo "🧪 Testing key dependencies..."
    
    # Test yfinance
    if python3 -c "import yfinance; print('✅ yfinance import successful')" 2>/dev/null; then
        echo "✅ yfinance is working correctly"
    else
        echo "⚠️ yfinance import failed, trying alternative installation..."
        $PIP_CMD install --no-cache-dir --force-reinstall yfinance==0.2.28 || echo "⚠️ Alternative yfinance installation failed"
    fi
    
    # Test aiohttp (critical for backtesting)
    if python3 -c "import aiohttp; print('✅ aiohttp import successful')" 2>/dev/null; then
        echo "✅ aiohttp is working correctly"
    else
        echo "⚠️ aiohttp import failed, trying alternative installation..."
        $PIP_CMD install --no-cache-dir --force-reinstall aiohttp>=3.8.0 || echo "⚠️ Alternative aiohttp installation failed"
    fi
    
    # Test python-dotenv
    if python3 -c "import dotenv; print('✅ python-dotenv import successful')" 2>/dev/null; then
        echo "✅ python-dotenv is working correctly"
    else
        echo "⚠️ python-dotenv import failed, trying alternative installation..."
        $PIP_CMD install --no-cache-dir --force-reinstall python-dotenv>=1.0.0 || echo "⚠️ Alternative python-dotenv installation failed"
    fi

    # Test pandas (critical for backtesting)
    if python3 -c "import pandas as pd; print('✅ pandas import successful:', pd.__version__)" 2>/dev/null; then
        echo "✅ pandas is working correctly"
    else
        echo "⚠️ pandas import failed, attempting installation..."
        $PIP_CMD install --no-cache-dir --force-reinstall "pandas>=2.0.0" || echo "⚠️ pandas installation failed"
    fi
else
    echo "⏭️ Skipping Python dependency installation (not in Render environment and no requirements file)"
fi

