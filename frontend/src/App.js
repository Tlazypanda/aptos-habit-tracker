import logo from './logo.svg';
import './App.css';
import { AptosWalletAdapterProvider} from '@aptos-labs/wallet-adapter-react';
import { Network } from "@aptos-labs/ts-sdk";
import Dashboard from './dashboard.js';


function App() {
  const wallets = [];
  return (
    <div className="App">
      <AptosWalletAdapterProvider
          plugins={wallets}
          autoConnect={true}
          optInWallets={["Petra"]}
          dappConfig={{ Network: Network.TESTNET }}
          onError={(error) => {
            console.log("error", error);
          }}
        >
        <Dashboard/>
        </AptosWalletAdapterProvider>

    </div>
  );
}

export default App;
