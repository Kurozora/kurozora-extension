/**
 * The marker identifying this extension's network-sniffer messages.
 */
export const SNIFFER_MESSAGE = 'kurozora:sniffer';

/**
 * A captured network response forwarded from the page's main world.
 */
export interface SnifferCaptureMessage {
  /**
   * The sniffer message marker.
   */
  source: typeof SNIFFER_MESSAGE;

  /**
   * The message kind.
   */
  kind: 'capture';

  /**
   * The response URL.
   */
  url: string;

  /**
   * The raw response body.
   */
  body: string;
}

/**
 * A request from the content script asking the interceptor to replay its buffer.
 */
export interface SnifferFlushMessage {
  /**
   * The sniffer message marker.
   */
  source: typeof SNIFFER_MESSAGE;

  /**
   * The message kind.
   */
  kind: 'flush';
}

/**
 * A message exchanged between the main-world interceptor and the content script.
 */
export type SnifferMessage = SnifferCaptureMessage | SnifferFlushMessage;
