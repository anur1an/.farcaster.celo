import { createConfig, http } from "wagmi";
import { walletConnect, injected, coinbaseWallet } from "wagmi/connectors";
import { celo, mainnet, base } from "wagmi/chains";

/**
 * Wagmi config untuk Farcaster Mini App
 * Support multiple chains (user bisa terhubung dari berbagai chain)
 * Tapi user harus switch ke Celo untuk mint .farcaster.celo domains
 * Menggunakan multiple connectors: Injected (built-in), WalletConnect, dan Coinbase
 */
export const wagmiConfig = createConfig({
  chains: [celo, mainnet, base],
  connectors: [
    // Prioritas 1: Coinbase Wallet (reliable in all contexts)
    coinbaseWallet({
      appName: "Farcaster Domain",
      appLogoUrl: "https://farcaster-celo.vercel.app/logo-512-v2.png",
    }),
    // Prioritas 2: Injected wallet (single instance for all providers)
    injected({
      target: undefined, // Accept all injected wallets
      shimDisconnect: true,
    }),
    // Prioritas 3: WalletConnect
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "",
      metadata: {
        name: "Farcaster Domain",
        description: "Mint .farcaster.celo domain names on Celo",
        url: typeof window !== 'undefined' ? window.location.origin : "",
        icons: [
          "https://farcaster-celo.vercel.app/logo-512-v2.png",
        ],
      },
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'dark',
      },
      // Mark chains as fresh to avoid unnecessary reconnections
      isNewChainsStale: false,
    }),
  ],
  transports: {
    [celo.id]: http(process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org"),
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});