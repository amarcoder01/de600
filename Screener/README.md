# Professional Stock Screener

A production-ready, enterprise-grade stock screening application that provides comprehensive market coverage with real-time data and advanced filtering capabilities powered by the Polygon.io API.

## 🌟 Key Features

### Enterprise Market Coverage
- **Real-time screening** across the complete U.S. stock market
- **Server-side filtering** for optimal performance
- **On-demand processing** - searches happen in real-time
- **Comprehensive coverage** of all active U.S. stocks

### Advanced Filtering
- **Price range filtering** with min/max values
- **Market cap filtering** in millions/billions
- **Volume analysis** with minimum thresholds
- **Sector filtering** across 11 major sectors
- **Exchange filtering** (NASDAQ, NYSE, AMEX, OTC)
- **Text search** by ticker symbol or company name

### Real-time Data
- **Live price data** from Polygon.io
- **Market cap calculations** with multiple fallback strategies
- **Volume and change data** for trend analysis
- **Sector and exchange mapping** for better categorization

### User Experience
- **Responsive design** that works on all devices
- **Real-time progress tracking** during screening
- **CSV export** functionality for results
- **Sortable columns** for easy data analysis
- **Error handling** with graceful fallbacks

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Polygon.io API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stock-screener
```

2. Install dependencies:
```bash
npm install
```

3. Set up your Polygon.io API key:
```bash
# Create a .env file in the root directory
echo "VITE_POLYGON_API_KEY=your_api_key_here" > .env
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## 🔧 Configuration

### Environment Variables
- `VITE_POLYGON_API_KEY`: Your Polygon.io API key (required)
- `VITE_NEXT_PUBLIC_POLYGON_API_KEY`: Alternative API key variable name

### API Rate Limits
The application is configured to respect Polygon.io's rate limits:
- Batch size: 15 requests per batch
- Delay between batches: 1 second
- Maximum results per request: 1000 stocks

## 📊 How It Works

### Professional Screening Process
1. **Server-side filtering**: Initial filtering happens on Polygon.io servers
2. **Price data fetching**: Batch processing of price and financial data
3. **Client-side refinement**: Additional filtering based on numerical criteria
4. **Real-time results**: Immediate display of matching stocks

### Filter Application
- **Search filters**: Applied server-side for immediate results
- **Exchange filters**: Mapped to Polygon.io exchange codes
- **Numerical filters**: Applied client-side for precise control
- **Sector filters**: Applied after data enrichment

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **API**: Polygon.io REST API
- **State Management**: React Hooks
- **Build Tool**: Vite
- **Linting**: ESLint + TypeScript
- **Testing**: Jest + Testing Library
- **Deployment**: Production-ready with optimized builds

## 📈 Production Features

- **Enterprise-grade performance** with optimized API usage
- **Intelligent rate limiting** to respect API constraints
- **Real-time progress tracking** for user feedback
- **Robust error recovery** with fallback strategies
- **Smart caching** of frequently accessed data
- **Production monitoring** and logging
- **Scalable architecture** for high-volume usage

## 🔍 Usage Examples

### Basic Screening
1. Enter a ticker symbol (e.g., "AAPL") in the search field
2. Click "Apply Filters" to search the entire market
3. View results with real-time price data

### Advanced Filtering
1. Set price range (e.g., $50-$200)
2. Set market cap range (e.g., $1B-$100B)
3. Select sector (e.g., "Technology")
4. Set minimum volume (e.g., 1,000,000)
5. Click "Apply Filters" for comprehensive results

### Export Results
1. Apply your desired filters
2. Click "Export CSV" to download results
3. Use the data in Excel or other analysis tools

## 🐛 Troubleshooting

### Common Issues

**API Key Error**
- Ensure your Polygon.io API key is correctly set in environment variables
- Check that the API key has the necessary permissions

**No Results Found**
- Try broadening your filter criteria
- Check if the search term is spelled correctly
- Verify that the filters aren't too restrictive

**Rate Limit Errors**
- The application automatically handles rate limits
- Wait a moment and try again
- Consider upgrading your Polygon.io plan for higher limits

### Debug Mode
Enable debug logging by opening the browser console and running:
```javascript
window.debugMarketCapStats()
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Review the browser console for error messages
- Ensure your Polygon.io API key is valid and has sufficient permissions

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```
