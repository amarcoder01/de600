#!/usr/bin/env python3
"""
Reinforcement Learning Engine for Phase 4
Implements RL-based trading agents with adaptive strategy learning
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import json
import warnings
warnings.filterwarnings('ignore')

class TradingEnvironment:
    """Custom trading environment for RL agent"""
    
    def __init__(self, data, initial_balance=10000, transaction_cost=0.001):
        self.data = data.reset_index(drop=True)
        self.initial_balance = initial_balance
        self.transaction_cost = transaction_cost
        self.reset()
        
    def reset(self):
        """Reset environment to initial state"""
        self.current_step = 0
        self.balance = self.initial_balance
        self.shares_held = 0
        self.net_worth = self.initial_balance
        self.max_net_worth = self.initial_balance
        self.trades = []
        self.done = False
        
        return self.get_state()
    
    def get_state(self):
        """Get current state representation"""
        if self.current_step >= len(self.data):
            return np.zeros(15)  # Return zero state if out of bounds
        
        current_price = self.data.iloc[self.current_step]['Close']
        
        # Technical indicators as state
        lookback = min(20, self.current_step + 1)
        start_idx = max(0, self.current_step - lookback + 1)
        recent_data = self.data.iloc[start_idx:self.current_step + 1]
        
        if len(recent_data) < 2:
            return np.zeros(15)
        
        # Price features
        returns = recent_data['Close'].pct_change().fillna(0)
        volatility = returns.std()
        momentum = (current_price / recent_data['Close'].iloc[0] - 1) if len(recent_data) > 1 else 0
        
        # Volume features
        volume_ratio = (recent_data['Volume'].iloc[-1] / recent_data['Volume'].mean()) if len(recent_data) > 1 else 1
        
        # Technical indicators
        sma_5 = recent_data['Close'].rolling(5).mean().iloc[-1] if len(recent_data) >= 5 else current_price
        sma_10 = recent_data['Close'].rolling(10).mean().iloc[-1] if len(recent_data) >= 10 else current_price
        
        rsi = self.calculate_rsi(recent_data['Close']) if len(recent_data) >= 14 else 50
        
        # Portfolio features
        portfolio_value = self.balance + self.shares_held * current_price
        position_ratio = (self.shares_held * current_price) / portfolio_value if portfolio_value > 0 else 0
        
        # Market regime features
        trend = 1 if current_price > sma_10 else -1 if current_price < sma_10 else 0
        volatility_regime = 1 if volatility > 0.02 else -1 if volatility < 0.01 else 0
        
        state = np.array([
            current_price / 100,  # Normalized price
            returns.iloc[-1] if len(returns) > 0 else 0,  # Last return
            volatility * 100,  # Volatility
            momentum,  # Momentum
            volume_ratio,  # Volume ratio
            (current_price - sma_5) / current_price if sma_5 > 0 else 0,  # Price vs SMA5
            (current_price - sma_10) / current_price if sma_10 > 0 else 0,  # Price vs SMA10
            (rsi - 50) / 50,  # Normalized RSI
            position_ratio,  # Position ratio
            self.balance / self.initial_balance,  # Cash ratio
            portfolio_value / self.initial_balance,  # Portfolio performance
            trend,  # Trend indicator
            volatility_regime,  # Volatility regime
            len(self.trades) / 100,  # Trade frequency
            (self.max_net_worth - portfolio_value) / self.max_net_worth if self.max_net_worth > 0 else 0  # Drawdown
        ])
        
        return state
    
    def calculate_rsi(self, prices, period=14):
        """Calculate RSI indicator"""
        if len(prices) < period + 1:
            return 50
        
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50
    
    def step(self, action):
        """Execute action and return next state, reward, done"""
        if self.done or self.current_step >= len(self.data) - 1:
            return self.get_state(), 0, True, {}
        
        current_price = self.data.iloc[self.current_step]['Close']
        
        # Execute action
        reward = self.execute_action(action, current_price)
        
        # Move to next step
        self.current_step += 1
        
        # Update portfolio value
        if self.current_step < len(self.data):
            next_price = self.data.iloc[self.current_step]['Close']
            portfolio_value = self.balance + self.shares_held * next_price
            self.net_worth = portfolio_value
            self.max_net_worth = max(self.max_net_worth, portfolio_value)
        
        # Check if done
        self.done = (self.current_step >= len(self.data) - 1) or (self.net_worth <= 0.1 * self.initial_balance)
        
        next_state = self.get_state()
        info = {
            'portfolio_value': self.net_worth,
            'trades_count': len(self.trades),
            'current_step': self.current_step
        }
        
        return next_state, reward, self.done, info
    
    def execute_action(self, action, current_price):
        """Execute trading action and calculate reward"""
        # Action: 0 = Hold, 1 = Buy, 2 = Sell
        reward = 0
        
        if action == 1:  # Buy
            if self.balance > current_price * (1 + self.transaction_cost):
                shares_to_buy = int(self.balance / (current_price * (1 + self.transaction_cost)))
                cost = shares_to_buy * current_price * (1 + self.transaction_cost)
                
                if shares_to_buy > 0:
                    self.balance -= cost
                    self.shares_held += shares_to_buy
                    self.trades.append({
                        'action': 'buy',
                        'shares': shares_to_buy,
                        'price': current_price,
                        'step': self.current_step
                    })
                    reward = -self.transaction_cost  # Transaction cost penalty
        
        elif action == 2:  # Sell
            if self.shares_held > 0:
                proceeds = self.shares_held * current_price * (1 - self.transaction_cost)
                self.balance += proceeds
                
                self.trades.append({
                    'action': 'sell',
                    'shares': self.shares_held,
                    'price': current_price,
                    'step': self.current_step
                })
                
                self.shares_held = 0
                reward = -self.transaction_cost  # Transaction cost penalty
        
        # Calculate portfolio-based reward
        portfolio_value = self.balance + self.shares_held * current_price
        
        # Reward based on portfolio performance
        if len(self.trades) > 0:
            # Calculate return since last trade
            last_trade_step = self.trades[-1]['step']
            if last_trade_step < self.current_step and last_trade_step >= 0:
                steps_since_trade = self.current_step - last_trade_step
                
                # Reward for profitable moves
                portfolio_return = (portfolio_value / self.initial_balance - 1)
                reward += portfolio_return * 0.1  # Scale reward
        
        # Penalty for excessive trading
        if len(self.trades) > 0:
            recent_trades = [t for t in self.trades if self.current_step - t['step'] <= 5]
            if len(recent_trades) > 3:
                reward -= 0.01  # Penalty for over-trading
        
        # Reward for maintaining profitable positions
        if portfolio_value > self.initial_balance:
            reward += 0.001
        
        return reward

class QLearningAgent:
    """Q-Learning agent for trading"""
    
    def __init__(self, state_size, action_size, learning_rate=0.01, discount_factor=0.95, epsilon=1.0, epsilon_decay=0.995, epsilon_min=0.01):
        self.state_size = state_size
        self.action_size = action_size
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.epsilon_min = epsilon_min
        
        # Q-table (simplified with state discretization)
        self.q_table = {}
        self.training_history = []
        
    def discretize_state(self, state):
        """Convert continuous state to discrete for Q-table"""
        # Simple discretization strategy
        discrete_state = []
        
        for i, value in enumerate(state):
            if i in [0, 4, 5, 6]:  # Price-related features - more granular
                discrete_value = int(np.clip(value * 10, -50, 50))
            elif i in [1, 2]:  # Returns and volatility
                discrete_value = int(np.clip(value * 20, -50, 50))
            elif i == 7:  # RSI
                discrete_value = int(np.clip(value * 5, -5, 5))
            else:  # Other features
                discrete_value = int(np.clip(value * 5, -10, 10))
            
            discrete_state.append(discrete_value)
        
        return tuple(discrete_state)
    
    def get_action(self, state):
        """Get action using epsilon-greedy policy"""
        discrete_state = self.discretize_state(state)
        
        # Exploration vs exploitation
        if np.random.random() <= self.epsilon:
            return np.random.choice(self.action_size)
        
        # Get Q-values for current state
        if discrete_state not in self.q_table:
            self.q_table[discrete_state] = np.zeros(self.action_size)
        
        return np.argmax(self.q_table[discrete_state])
    
    def learn(self, state, action, reward, next_state, done):
        """Update Q-values based on experience"""
        discrete_state = self.discretize_state(state)
        discrete_next_state = self.discretize_state(next_state)
        
        # Initialize Q-values if not exists
        if discrete_state not in self.q_table:
            self.q_table[discrete_state] = np.zeros(self.action_size)
        if discrete_next_state not in self.q_table:
            self.q_table[discrete_next_state] = np.zeros(self.action_size)
        
        # Q-learning update
        current_q = self.q_table[discrete_state][action]
        
        if done:
            target_q = reward
        else:
            target_q = reward + self.discount_factor * np.max(self.q_table[discrete_next_state])
        
        # Update Q-value
        self.q_table[discrete_state][action] = current_q + self.learning_rate * (target_q - current_q)
        
        # Decay epsilon
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

class ReinforcementLearningEngine:
    """Main RL engine for trading strategy optimization"""
    
    def __init__(self):
        self.agents = {}
        self.training_results = {}
        self.strategy_performance = {}
        
        print("🤖 Reinforcement Learning Engine initialized")
    
    def create_agent(self, symbol, agent_type='q_learning'):
        """Create RL agent for specific symbol"""
        if agent_type == 'q_learning':
            agent = QLearningAgent(
                state_size=15,
                action_size=3,  # Hold, Buy, Sell
                learning_rate=0.01,
                discount_factor=0.95,
                epsilon=1.0,
                epsilon_decay=0.995,
                epsilon_min=0.01
            )
        else:
            raise ValueError(f"Unsupported agent type: {agent_type}")
        
        self.agents[symbol] = agent
        return agent
    
    def train_agent(self, symbol, period='2y', episodes=100):
        """Train RL agent on historical data"""
        print(f"🏋️ Training RL agent for {symbol}...")
        
        # Get training data
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period)
        
        if len(data) < 100:
            raise ValueError(f"Insufficient data for {symbol}")
        
        # Create agent if not exists
        if symbol not in self.agents:
            agent = self.create_agent(symbol)
        else:
            agent = self.agents[symbol]
        
        # Create trading environment
        env = TradingEnvironment(data, initial_balance=10000)
        
        # Training loop
        episode_rewards = []
        episode_returns = []
        
        for episode in range(episodes):
            state = env.reset()
            total_reward = 0
            
            while not env.done:
                action = agent.get_action(state)
                next_state, reward, done, info = env.step(action)
                
                agent.learn(state, action, reward, next_state, done)
                
                state = next_state
                total_reward += reward
            
            # Calculate episode performance
            episode_return = (env.net_worth / env.initial_balance - 1) * 100
            episode_rewards.append(total_reward)
            episode_returns.append(episode_return)
            
            if episode % 20 == 0:
                avg_return = np.mean(episode_returns[-20:])
                print(f"  Episode {episode}: Avg Return = {avg_return:.2f}%, Epsilon = {agent.epsilon:.3f}")
        
        # Store training results
        self.training_results[symbol] = {
            'episode_rewards': episode_rewards,
            'episode_returns': episode_returns,
            'final_epsilon': agent.epsilon,
            'q_table_size': len(agent.q_table),
            'avg_return': np.mean(episode_returns[-20:]),
            'best_return': max(episode_returns),
            'training_episodes': episodes
        }
        
        print(f"✅ Training completed for {symbol}")
        print(f"   Average Return: {np.mean(episode_returns[-20:]):.2f}%")
        print(f"   Best Return: {max(episode_returns):.2f}%")
        print(f"   Q-table size: {len(agent.q_table)} states")
        
        return self.training_results[symbol]
    
    def test_agent(self, symbol, test_period='3mo'):
        """Test trained agent on recent data"""
        if symbol not in self.agents:
            raise ValueError(f"No trained agent found for {symbol}")
        
        agent = self.agents[symbol]
        agent.epsilon = 0  # No exploration during testing
        
        # Get test data
        ticker = yf.Ticker(symbol)
        test_data = ticker.history(period=test_period)
        
        # Create test environment
        env = TradingEnvironment(test_data, initial_balance=10000)
        
        state = env.reset()
        actions_taken = []
        portfolio_values = []
        
        while not env.done:
            action = agent.get_action(state)
            next_state, reward, done, info = env.step(action)
            
            actions_taken.append(action)
            portfolio_values.append(info['portfolio_value'])
            
            state = next_state
        
        # Calculate test performance
        final_return = (env.net_worth / env.initial_balance - 1) * 100
        max_drawdown = self.calculate_max_drawdown(portfolio_values)
        sharpe_ratio = self.calculate_sharpe_ratio(portfolio_values)
        
        test_results = {
            'symbol': symbol,
            'test_period': test_period,
            'initial_balance': env.initial_balance,
            'final_balance': env.net_worth,
            'total_return': final_return,
            'total_trades': len(env.trades),
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'actions_distribution': {
                'hold': actions_taken.count(0),
                'buy': actions_taken.count(1),
                'sell': actions_taken.count(2)
            },
            'portfolio_values': portfolio_values[-10:],  # Last 10 values
            'success': final_return > 0
        }
        
        return test_results
    
    def calculate_max_drawdown(self, portfolio_values):
        """Calculate maximum drawdown"""
        if not portfolio_values:
            return 0
        
        portfolio_values = np.array(portfolio_values)
        running_max = np.maximum.accumulate(portfolio_values)
        drawdowns = (portfolio_values - running_max) / running_max
        
        return abs(np.min(drawdowns)) * 100
    
    def calculate_sharpe_ratio(self, portfolio_values, risk_free_rate=0.02):
        """Calculate Sharpe ratio"""
        if len(portfolio_values) < 2:
            return 0
        
        returns = np.diff(portfolio_values) / portfolio_values[:-1]
        
        if np.std(returns) == 0:
            return 0
        
        excess_returns = np.mean(returns) - risk_free_rate / 252  # Daily risk-free rate
        sharpe = excess_returns / np.std(returns) * np.sqrt(252)  # Annualized
        
        return sharpe
    
    def get_strategy_recommendation(self, symbol):
        """Get RL-based strategy recommendation"""
        if symbol not in self.agents:
            return {
                'error': f'No trained agent found for {symbol}',
                'recommendation': 'Train agent first'
            }
        
        # Get recent data for current state
        ticker = yf.Ticker(symbol)
        recent_data = ticker.history(period='1mo')
        
        if len(recent_data) < 10:
            return {
                'error': 'Insufficient recent data',
                'recommendation': 'hold'
            }
        
        # Create temporary environment to get current state
        env = TradingEnvironment(recent_data, initial_balance=10000)
        env.current_step = len(recent_data) - 1
        current_state = env.get_state()
        
        # Get agent recommendation
        agent = self.agents[symbol]
        agent.epsilon = 0  # No exploration for recommendation
        
        action = agent.get_action(current_state)
        action_names = ['hold', 'buy', 'sell']
        recommended_action = action_names[action]
        
        # Get Q-values for confidence
        discrete_state = agent.discretize_state(current_state)
        if discrete_state in agent.q_table:
            q_values = agent.q_table[discrete_state]
            confidence = (np.max(q_values) - np.mean(q_values)) / (np.std(q_values) + 1e-8)
            confidence = min(0.95, max(0.5, abs(confidence) * 0.2 + 0.6))
        else:
            confidence = 0.5
        
        recommendation = {
            'symbol': symbol,
            'action': recommended_action,
            'confidence': confidence,
            'q_values': q_values.tolist() if discrete_state in agent.q_table else [0, 0, 0],
            'state_features': {
                'current_price': recent_data['Close'].iloc[-1],
                'momentum': (recent_data['Close'].iloc[-1] / recent_data['Close'].iloc[-10] - 1) * 100,
                'volatility': recent_data['Close'].pct_change().std() * 100,
                'volume_trend': recent_data['Volume'].iloc[-5:].mean() / recent_data['Volume'].mean()
            },
            'training_performance': self.training_results.get(symbol, {}),
            'timestamp': datetime.now().isoformat()
        }
        
        return recommendation
    
    def adaptive_learning(self, symbol, market_regime):
        """Adapt learning parameters based on market regime"""
        if symbol not in self.agents:
            return False
        
        agent = self.agents[symbol]
        
        # Adjust learning parameters based on market conditions
        regime = market_regime.get('regime', 'sideways')
        volatility = market_regime.get('volatility', 0.2)
        
        if 'high_vol' in regime or volatility > 0.3:
            # High volatility - increase exploration and learning rate
            agent.epsilon = min(0.3, agent.epsilon * 1.1)
            agent.learning_rate = min(0.05, agent.learning_rate * 1.2)
        elif 'low_vol' in regime or volatility < 0.1:
            # Low volatility - decrease exploration, maintain learning
            agent.epsilon = max(0.05, agent.epsilon * 0.9)
            agent.learning_rate = max(0.005, agent.learning_rate * 0.9)
        
        # Adjust discount factor based on market regime
        if 'bull' in regime:
            agent.discount_factor = min(0.99, agent.discount_factor + 0.01)  # More forward-looking
        elif 'bear' in regime:
            agent.discount_factor = max(0.9, agent.discount_factor - 0.01)  # More immediate focus
        
        return True

def main():
    """Test the Reinforcement Learning Engine"""
    if len(sys.argv) < 2:
        print("Usage: python reinforcement_learning_engine.py <symbol> [action]")
        print("Actions: train, test, recommend")
        sys.exit(1)
    
    symbol = sys.argv[1].upper()
    action = sys.argv[2].lower() if len(sys.argv) > 2 else 'recommend'
    
    try:
        rl_engine = ReinforcementLearningEngine()
        
        if action == 'train':
            # Train agent
            training_results = rl_engine.train_agent(symbol, episodes=50)  # Reduced for demo
            result = {
                'success': True,
                'action': 'train',
                'symbol': symbol,
                'training_results': training_results
            }
        
        elif action == 'test':
            # First train, then test
            rl_engine.train_agent(symbol, episodes=30)
            test_results = rl_engine.test_agent(symbol)
            result = {
                'success': True,
                'action': 'test',
                'symbol': symbol,
                'test_results': test_results
            }
        
        else:  # recommend
            # Train if no agent exists, then recommend
            if symbol not in rl_engine.agents:
                rl_engine.train_agent(symbol, episodes=30)
            
            recommendation = rl_engine.get_strategy_recommendation(symbol)
            result = {
                'success': True,
                'action': 'recommend',
                'symbol': symbol,
                'recommendation': recommendation
            }
        
        result['timestamp'] = datetime.now().isoformat()
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e),
            'symbol': symbol,
            'action': action,
            'timestamp': datetime.now().isoformat()
        }))

if __name__ == "__main__":
    import sys
    main()
