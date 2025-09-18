#!/usr/bin/env python3
"""
Qlib Configuration for Trading Platform
Uses custom Qlib implementation for better compatibility
"""
import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import yaml

logger = logging.getLogger(__name__)

class QlibConfig:
    def __init__(self, config_path: Optional[str] = None):
        self.project_root = Path(__file__).parent.parent
        self.config_path = config_path or (self.project_root / "qlib_config.yaml")
        self.data_dir = self.project_root / "data"
        self.qlib_data_dir = self.data_dir / "qlib"
        
        # Default configuration
        self.default_config = {
            "provider_uri": str(self.qlib_data_dir),
            "region": "US",
            "cache_dir": str(self.data_dir / "cache"),
            "log_level": "INFO",
            "data_sources": {
                "yfinance": {
                    "enabled": True,
                    "timeout": 30
                }
            },
            "backtesting": {
                "default_initial_capital": 100000,
                "default_commission": 0.001,
                "default_slippage": 0.001
            },
            "strategies": {
                "momentum": {
                    "lookback_period": 20,
                    "momentum_threshold": 0.02
                },
                "mean_reversion": {
                    "lookback_period": 20,
                    "std_threshold": 2.0
                },
                "ml_ensemble": {
                    "feature_window": 30,
                    "prediction_horizon": 5
                }
            }
        }
        
        # Load configuration
        self.config = self._load_config()
        
        # Setup environment
        self._setup_environment()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or create default"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    user_config = yaml.safe_load(f) or {}
                return self._merge_configs(self.default_config, user_config)
            else:
                # Create default config file
                self.save_config()
                return self.default_config
        except Exception as e:
            logger.warning(f"Failed to load config file: {e}, using defaults")
            return self.default_config
    
    def _merge_configs(self, default: Dict, user: Dict):
        """Recursively merge user config with default"""
        result = default.copy()
        for key, value in user.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._merge_configs(result[key], value)
            else:
                result[key] = value
        return result
    
    def _setup_environment(self):
        """Setup environment variables and directories"""
        try:
            # Set environment variables
            os.environ['QLIB_PROVIDER_URI'] = self.config['provider_uri']
            os.environ['QLIB_REGION'] = self.config['region']
            
            # Create necessary directories
            Path(self.config['provider_uri']).mkdir(parents=True, exist_ok=True)
            Path(self.config['cache_dir']).mkdir(parents=True, exist_ok=True)
            
            logger.info("Qlib environment setup completed")
            
        except Exception as e:
            logger.error(f"Failed to setup Qlib environment: {e}")
    
    def get_config(self, section: str = None) -> Dict[str, Any]:
        """Get configuration section or entire config"""
        if section:
            return self.config.get(section, {})
        return self.config
    
    def update_config(self, section: str, key: str, value: Any):
        """Update configuration value"""
        if section not in self.config:
            self.config[section] = {}
        self.config[section][key] = value
    
    def save_config(self):
        """Save configuration to file"""
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                yaml.dump(self.config, f, default_flow_style=False, indent=2)
            logger.info(f"Configuration saved to {self.config_path}")
        except Exception as e:
            logger.error(f"Failed to save configuration: {e}")
            # Try to install PyYAML if not available
            try:
                import subprocess
                import sys
                subprocess.check_call([sys.executable, "-m", "pip", "install", "PyYAML"])
                with open(self.config_path, 'w', encoding='utf-8') as f:
                    yaml.dump(self.config, f, default_flow_style=False, indent=2)
                logger.info(f"Configuration saved to {self.config_path} after installing PyYAML")
            except Exception as e2:
                logger.error(f"Failed to install PyYAML and save config: {e2}")

# Global configuration instance
qlib_config = QlibConfig()

def init_qlib():
    """Initialize Qlib with proper configuration"""
    try:
        # Import and use custom Qlib implementation
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from custom_qlib import init as custom_qlib_init
        
        # Initialize with configuration
        config = qlib_config.get_config()
        qlib_instance = custom_qlib_init(
            provider_uri=config['provider_uri'],
            region=config['region']
        )
        
        logger.info("Custom Qlib initialized successfully")
        return qlib_instance
        
    except Exception as e:
        logger.error(f"Failed to initialize Qlib: {e}")
        return None

def get_qlib_config():
    """Get the global Qlib configuration instance"""
    return qlib_config

if __name__ == "__main__":
    # Test configuration
    print("Testing Qlib Configuration...")
    
    config = get_qlib_config()
    print(f"Provider URI: {config.get_config('provider_uri')}")
    print(f"Region: {config.get_config('region')}")
    
    # Test initialization
    qlib_instance = init_qlib()
    if qlib_instance:
        print("Qlib initialization successful")
    else:
        print("Qlib initialization failed")
