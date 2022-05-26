/*global cardano, a*/
import { useEffect, useState } from "react";
import * as S from 'cardano-serialization-lib-asmjs';
import { Buffer } from "buffer"

function App() {

  // Wallet address
  // Signed Nonce

  const [walletEnabled, setWalletEnabled] = useState(false);
  const [walletApi, setWalletApi] = useState(false);
  const [adaBalanace, setWalletBalance] = useState(false);
  const [rewardAddress, setWalletRewardAddr] = useState(false);
  const [errorMessage, setErrorMessage] = useState(false);
  const [walletName, setWalletName] = useState(false);
  const [serverMessage, setMessage] = useState(false);

  useEffect(() => {
    if (typeof cardano === "undefined") {
      return
    }

    ; (async () => {
      ['nami', 'eternl'].some(async (walletProvider) => {
        const isConnected = await cardano[walletProvider].isEnabled()
        if (isConnected) {
          const api = await cardano[walletProvider].enable();
          setWalletApi(api);
          setWalletEnabled(!!api);
          setWalletName(walletProvider);
        }
      });
    })();

  }, []);

  useEffect(() => {
    if (!walletApi) return;

    ; (async () => {
      let balance = await walletApi.getBalance();
      const balanceDecoded = S.Value.from_bytes(
        Buffer.from(balance, 'hex')
      )
      const lovelaces = balanceDecoded.coin().to_str();
      setWalletBalance(lovelaces / 1000000);

      let rewardAddressesEncoded = await walletApi.getRewardAddresses();
      setWalletRewardAddr(rewardAddressesEncoded[0]);
    })();
  }, [walletApi])


  async function connectWallet(name) {
    let api = await cardano[name].enable();
    setWalletName(name);
    setWalletEnabled(!!api);
    setWalletApi(api);
  }

  async function signIn() {
    const nonceResponse = await fetch('http://192.168.1.127:3000/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stakingAddress: rewardAddress,
      })
    });

    const data = await nonceResponse.json();
    let signedPayload;

    try {
      // Fuck Nami
      if (walletName === 'nami') {
        signedPayload = await cardano.signData(
          rewardAddress,
          data.nonce
        );
      } else {
        signedPayload = await walletApi.signData(
          rewardAddress,
          data.nonce
        );
      }
    } catch (error) {
      setErrorMessage(error.info);
      return;
    }

    let response = await fetch('http://192.168.1.127:3000/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signedPayload: signedPayload,
        stakingAddress: rewardAddress,
        nonce: data.nonce
      })
    })

    const responseData = await response.json();
    setMessage(responseData.message);

  }

  return (
    <div className="p-12">

      {walletEnabled && (
        <>
          <h1>Your <strong>{walletName.charAt(0).toUpperCase() + walletName.slice(1)}</strong> wallet is enabled.</h1>
          <p><strong>Balance:</strong> {adaBalanace && ('₳' + adaBalanace)}</p>
          <p><strong>Reward Address:</strong> {rewardAddress}</p>
          {!serverMessage && (
            <button
              onClick={signIn}
              className="bg-blue-200 hover:bg-blue-400 px-3 py-2 rounded my-3">
              Sign In
            </button>
          )}
          {errorMessage && (
            <div className="px-4 py-2 my-3 bg-red-100 hover:bg-red-200 text-red-800 border border-red-400 rounded flex"
            >
              <div className="grow">
                ⚠️ {errorMessage}
              </div>
              <div>
                <button
                  className="cursor-pointer"
                  onClick={() => setErrorMessage(false)}>X
                </button>
              </div>
            </div>
          )}
          {serverMessage && (
            <div className="px-4 py-2 my-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-400 rounded flex"
            >
              <div className="grow">
                🙌 {serverMessage}
              </div>
              <div>
                <button
                  className="cursor-pointer"
                  onClick={() => setMessage(false)}>X
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!walletEnabled && (
        <>
          <button
            onClick={() => connectWallet('nami')}
            className="bg-blue-200 hover:bg-blue-400 px-3 py-2 rounded">
            Connect Nami
          </button>
          <button
            onClick={() => connectWallet('eternl')}
            className="bg-blue-200 hover:bg-blue-400 px-3 py-2 ml-3 rounded">
            Connect Eternl
          </button>
        </>
      )}
    </div>
  );
}

export default App;
