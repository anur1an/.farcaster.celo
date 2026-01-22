/**
 * Farcaster SDK Initialization
 * Based on: https://miniapps.farcaster.xyz/docs/sdk
 * Handles SDK setup and lifecycle for mini apps
 */

interface FarcasterSDK {
  isInMiniApp?: () => boolean;
  actions?: {
    ready?: () => void;
    close?: () => void;
    composeCast?: (options: any) => void;
    addMiniApp?: (options: any) => void;
  };
  capabilities?: {
    getCapabilities?: () => string[];
    isSupported?: (capability: string) => boolean;
  };
}

declare global {
  interface Window {
    farcaster?: FarcasterSDK;
  }
}

let sdkInitialized = false;
let isInMiniAppContext = false;

/**
 * Check if the app is running in a Farcaster mini app context
 */
export function isInMiniApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if Farcaster SDK is available
  const hasSdk = typeof (window as any).farcaster !== 'undefined';
  
  // Check if isInMiniApp function exists
  if (hasSdk && (window as any).farcaster?.isInMiniApp) {
    try {
      return (window as any).farcaster.isInMiniApp();
    } catch (error) {
      console.warn('Error calling farcaster.isInMiniApp():', error);
    }
  }

  // Fallback: check for farcaster context in window
  if ((window as any).farcasterMiniAppContext) {
    return true;
  }

  // Check URL params (for testing)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fid') && params.get('contextToken')) {
      return true;
    }
  }

  return false;
}

/**
 * Signal to Farcaster that the app is ready
 * This removes the splash screen
 * See: https://miniapps.farcaster.xyz/docs/sdk/actions/ready
 */
export function notifyAppReady(): void {
  if (typeof window === 'undefined') {
    console.warn('notifyAppReady: window is not available');
    return;
  }

  try {
    const sdk = (window as any).farcaster;
    
    if (!sdk) {
      console.warn('Farcaster SDK not available - app may not be running in mini app context');
      return;
    }

    if (typeof sdk.actions?.ready === 'function') {
      console.log('Calling sdk.actions.ready()');
      sdk.actions.ready();
      sdkInitialized = true;
    } else {
      console.warn('sdk.actions.ready is not available');
    }
  } catch (error) {
    console.error('Error calling sdk.actions.ready():', error);
  }
}

/**
 * Initialize the Farcaster SDK
 * Call this as early as possible in your app lifecycle
 */
export function initializeFarcasterSDK(): void {
  if (sdkInitialized) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Check if we're in mini app context
    isInMiniAppContext = isInMiniApp();
    
    if (isInMiniAppContext) {
      console.log('Farcaster Mini App detected');
      
      // Give the SDK time to initialize before calling ready
      // This ensures the SDK is fully set up
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            notifyAppReady();
          }, 100);
        });
      } else {
        // DOM is already loaded
        setTimeout(() => {
          notifyAppReady();
        }, 100);
      }
    } else {
      console.log('Not in Farcaster Mini App context');
      sdkInitialized = true; // Mark as initialized even outside mini app
    }
  } catch (error) {
    console.error('Error initializing Farcaster SDK:', error);
    sdkInitialized = true; // Mark as initialized to prevent retries
  }
}

/**
 * Check if a capability is supported
 * See: https://miniapps.farcaster.xyz/docs/sdk/detecting-capabilities
 */
export function isCapabilitySupported(capability: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const sdk = (window as any).farcaster;
    
    if (!sdk?.capabilities?.isSupported) {
      return false;
    }

    return sdk.capabilities.isSupported(capability);
  } catch (error) {
    console.warn(`Error checking capability "${capability}":`, error);
    return false;
  }
}

/**
 * Get all supported capabilities
 */
export function getSupportedCapabilities(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const sdk = (window as any).farcaster;
    
    if (!sdk?.capabilities?.getCapabilities) {
      return [];
    }

    return sdk.capabilities.getCapabilities();
  } catch (error) {
    console.warn('Error getting capabilities:', error);
    return [];
  }
}

/**
 * Compose a cast using the Farcaster UI
 * See: https://miniapps.farcaster.xyz/docs/sdk/actions/compose-cast
 */
export function composeCast(options?: {
  text?: string;
  embeds?: any[];
}): void {
  if (typeof window === 'undefined') {
    console.warn('composeCast: window is not available');
    return;
  }

  try {
    const sdk = (window as any).farcaster;
    
    if (!sdk?.actions?.composeCast) {
      console.warn('composeCast is not available');
      return;
    }

    sdk.actions.composeCast(options || {});
  } catch (error) {
    console.error('Error composing cast:', error);
  }
}

/**
 * Close the mini app
 * See: https://miniapps.farcaster.xyz/docs/sdk/actions/close
 */
export function closeMiniApp(): void {
  if (typeof window === 'undefined') {
    console.warn('closeMiniApp: window is not available');
    return;
  }

  try {
    const sdk = (window as any).farcaster;
    
    if (!sdk?.actions?.close) {
      console.warn('close action is not available');
      return;
    }

    sdk.actions.close();
  } catch (error) {
    console.error('Error closing mini app:', error);
  }
}

/**
 * Sign a manifest for authentication
 * See: https://miniapps.farcaster.xyz/docs/sdk/actions/sign-manifest
 */
export async function signManifest(manifest: {
  domain: string;
  timestamp: number;
  signature?: string;
}): Promise<string | null> {
  if (typeof window === 'undefined') {
    console.warn('signManifest: window is not available');
    return null;
  }

  try {
    const sdk = (window as any).farcaster;
    
    if (!sdk?.actions?.signManifest) {
      console.warn('signManifest is not available');
      return null;
    }

    const signature = await sdk.actions.signManifest(manifest);
    return signature;
  } catch (error) {
    console.error('Error signing manifest:', error);
    return null;
  }
}

export { isInMiniAppContext };
