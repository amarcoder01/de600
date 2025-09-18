import { Fragment } from 'react';
import { Toaster } from 'sonner';
import StockScreener from './pages/StockScreener';

function App() {
  return (
    <>
      <StockScreener />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App
