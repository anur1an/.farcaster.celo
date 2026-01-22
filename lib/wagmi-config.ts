import { createConfig, http } from "wagmi";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { mainnet, base, optimism, celo } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [mainnet, base, optimism, celo],
  connectors: [
    farcasterMiniApp(),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [celo.id]: http(),
  },
});