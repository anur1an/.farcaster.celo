/**
 * Farcaster Mini App Context
 * Based on: https://miniapps.farcaster.xyz/docs/guides/auth
 * Provides context and utilities for Mini App authentication and sharing
 */

export interface MiniAppContext {
  /**
   * The FID (Farcaster ID) of the user running the Mini App
   */
  fid: number

  /**
   * The context token that can be used to verify actions on the server
   * This token should be used when making authenticated API requests
   */
  contextToken: string

  /**
   * Timestamp when the context was created
   */
  timestamp: number

  /**
   * Whether the user is in a frame context
   */
  isInFrame: boolean
}

export interface ShareOptions {
  /**
   * The text to share
   */
  text: string

  /**
   * Optional image/preview URL
   */
  imageUrl?: string

  /**
   * The title of the content being shared
   */
  title?: string

  /**
   * Optional target URL
   */
  targetUrl?: string
}

export interface ShareExtensionOptions extends ShareOptions {
  /**
   * Callback when share completes
   */
  onComplete?: (success: boolean) => void

  /**
   * Callback for errors
   */
  onError?: (error: Error) => void
}

/**
 * Get the Mini App context from the window object
 * This is set by the Farcaster client when the Mini App is loaded
 */
export function getMiniAppContext(): MiniAppContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    // Check if we're in a Farcaster context
    const context = (window as any).farcasterMiniAppContext
    if (context && context.fid && context.contextToken) {
      return {
        fid: context.fid,
        contextToken: context.contextToken,
        timestamp: context.timestamp || Date.now(),
        isInFrame: true,
      }
    }

    // Fallback: check for context in URL params (for testing)
    const params = new URLSearchParams(window.location.search)
    const fid = params.get('fid')
    const contextToken = params.get('contextToken')

    if (fid && contextToken) {
      return {
        fid: parseInt(fid, 10),
        contextToken,
        timestamp: Date.now(),
        isInFrame: true,
      }
    }

    return null
  } catch (error) {
    console.error('Error getting Mini App context:', error)
    return null
  }
}

/**
 * Verify that the Mini App context is valid
 */
export function isValidMiniAppContext(context: MiniAppContext | null): boolean {
  if (!context) return false
  return context.fid > 0 && context.contextToken.length > 0
}

/**
 * Share content through the Farcaster share dialog
 * This opens the native Farcaster share UI
 */
export function shareToFarcaster(options: ShareOptions): void {
  if (typeof window === 'undefined') {
    console.error('Share is only available in browser')
    return
  }

  try {
    // Construct the Farcaster share URL
    const params = new URLSearchParams()
    params.set('text', options.text)
    if (options.imageUrl) params.set('image', options.imageUrl)
    if (options.title) params.set('title', options.title)
    if (options.targetUrl) params.set('url', options.targetUrl)

    const shareUrl = `https://warpcast.com/~/compose?${params.toString()}`

    // Try to use the native share extension first
    if ((window as any).farcasterShareExtension) {
      ;(window as any).farcasterShareExtension.share({
        text: options.text,
        image: options.imageUrl,
        url: options.targetUrl,
      })
    } else {
      // Fallback to opening in new window
      window.open(shareUrl, 'warpcast', 'width=600,height=800')
    }
  } catch (error) {
    console.error('Error sharing to Farcaster:', error)
  }
}

/**
 * Share content using the share extension (if available)
 */
export async function shareWithExtension(
  options: ShareExtensionOptions
): Promise<boolean> {
  if (typeof window === 'undefined') {
    const error = new Error('Share extension is only available in browser')
    options.onError?.(error)
    return false
  }

  try {
    if (!(window as any).farcasterShareExtension) {
      const error = new Error('Share extension not available')
      options.onError?.(error)
      return false
    }

    const result = await (window as any).farcasterShareExtension.share({
      text: options.text,
      image: options.imageUrl,
      url: options.targetUrl,
      title: options.title,
    })

    options.onComplete?.(result?.success ?? true)
    return result?.success ?? true
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    options.onError?.(err)
    return false
  }
}

/**
 * Embed a Mini App into a frame
 * Returns the embed code that can be used in frames or shared content
 */
export function getEmbedCode(miniAppUrl: string): string {
  return `<iframe src="${miniAppUrl}" style="width: 100%; height: 600px; border: none; border-radius: 12px;" />`
}

/**
 * Get the share URL for the Mini App
 */
export function getMiniAppShareUrl(baseUrl: string, context?: MiniAppContext): string {
  const url = new URL(baseUrl)

  if (context) {
    url.searchParams.set('fid', String(context.fid))
    url.searchParams.set('contextToken', context.contextToken)
  }

  return url.toString()
}

/**
 * Check if running inside a Farcaster frame
 */
export function isInFrame(): boolean {
  if (typeof window === 'undefined') return false

  return (
    !!(window as any).farcasterMiniAppContext ||
    window.location.search.includes('contextToken')
  )
}

/**
 * Get user FID from context or URL
 */
export function getUserFid(): number | null {
  const context = getMiniAppContext()
  return context?.fid ?? null
}

/**
 * Get context token for API requests
 */
export function getContextToken(): string | null {
  const context = getMiniAppContext()
  return context?.contextToken ?? null
}

/**
 * Create headers for authenticated API requests
 * These headers should be sent with requests that need user authentication
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getContextToken()

  if (!token) {
    return {}
  }

  return {
    'X-Farcaster-Context-Token': token,
    'Authorization': `Bearer ${token}`,
  }
}

/**
 * Deep link to open another Mini App or frame
 */
export function openMiniApp(url: string, options?: { target?: string }): void {
  if (typeof window === 'undefined') return

  if ((window as any).farcasterMiniApp?.openUrl) {
    ;(window as any).farcasterMiniApp.openUrl(url, options?.target)
  } else {
    window.location.href = url
  }
}

/**
 * Close the current Mini App or frame
 */
export function closeMiniApp(): void {
  if (typeof window === 'undefined') return

  if ((window as any).farcasterMiniApp?.close) {
    ;(window as any).farcasterMiniApp.close()
  } else {
    window.history.back()
  }
}

/**
 * Post message to the frame context
 * Used for communication between the Mini App and the parent frame
 */
export function postMessageToFrame(message: any): void {
  if (typeof window === 'undefined') return

  if ((window as any).farcasterMiniApp?.postMessage) {
    ;(window as any).farcasterMiniApp.postMessage(message)
  } else if (window.parent !== window) {
    window.parent.postMessage(message, '*')
  }
}
