import React from "react";
import Modal from "components/Modal/Modal";
import { Trans, t } from "@lingui/macro";
import metamaskImg from "img/metamask.png";
import coinbaseImg from "img/coinbaseWallet.png";
import walletConnectImg from "img/walletconnect-circle-blue.svg";
import "./WalletModal.css";

type Props = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  activateMetaMask: () => void;
  activateCoinBase: () => void;
  activateWalletConnect: () => void;
};

export default function WalletModal({
  isVisible,
  setIsVisible,
  activateMetaMask,
  activateCoinBase,
  activateWalletConnect,
}: Props) {
  const handleMetaMaskClick = () => {
    activateMetaMask();
    // Modal will auto-close when wallet connects via useEffect in AppHeaderUser
  };

  const handleCoinBaseClick = () => {
    activateCoinBase();
    // Modal will auto-close when wallet connects via useEffect in AppHeaderUser
  };

  const handleWalletConnectClick = () => {
    activateWalletConnect();
    // Modal will auto-close when wallet connects via useEffect in AppHeaderUser
  };

  return (
    <Modal
      className="Connect-wallet-modal"
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`Connect Wallet`}
    >
      <div className="wallet-modal-content">
        <button className="Wallet-btn MetaMask-btn" onClick={handleMetaMaskClick}>
          <img src={metamaskImg} alt="MetaMask" />
          <div>
            <Trans>MetaMask</Trans>
          </div>
        </button>
        <button className="Wallet-btn CoinbaseWallet-btn" onClick={handleCoinBaseClick}>
          <img src={coinbaseImg} alt="Coinbase Wallet" />
          <div>
            <Trans>Coinbase Wallet</Trans>
          </div>
        </button>
        <button className="Wallet-btn WalletConnect-btn" onClick={handleWalletConnectClick}>
          <img src={walletConnectImg} alt="WalletConnect" />
          <div>
            <Trans>WalletConnect</Trans>
          </div>
        </button>
      </div>
    </Modal>
  );
}

