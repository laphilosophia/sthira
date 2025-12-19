import type { SerializationFormat, Serializer } from './types';

/**
 * JSON serializer (default, always available)
 */
export const jsonSerializer: Serializer = {
  format: 'json',

  encode<T>(data: T): Uint8Array {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
  },

  decode<T>(buffer: Uint8Array): T {
    const json = new TextDecoder().decode(buffer);
    return JSON.parse(json) as T;
  },
};

/**
 * MessagePack module interface (for lazy loading)
 */
interface MsgpackModule {
  encode: <T>(data: T) => Uint8Array;
  decode: <T>(buffer: Uint8Array) => T;
}

let msgpackModule: MsgpackModule | null = null;

/**
 * MessagePack serializer (optional, faster & smaller)
 * Lazy loaded to reduce bundle size
 */
export const msgpackSerializer: Serializer = {
  format: 'msgpack',

  encode<T>(data: T): Uint8Array {
    if (!msgpackModule) {
      throw new Error(
        '[Sthira] MessagePack not loaded. Call loadMsgpack() first or use jsonSerializer.',
      );
    }
    return msgpackModule.encode(data);
  },

  decode<T>(buffer: Uint8Array): T {
    if (!msgpackModule) {
      throw new Error(
        '[Sthira] MessagePack not loaded. Call loadMsgpack() first or use jsonSerializer.',
      );
    }
    return msgpackModule.decode(buffer);
  },
};

/**
 * Load MessagePack module (async)
 */
export async function loadMsgpack(): Promise<void> {
  if (msgpackModule) return;

  try {
    // Dynamic import hidden from Vite's static analysis
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function('m', 'return import(m)');
    const mod = await dynamicImport('@msgpack/msgpack');
    msgpackModule = {
      encode: mod.encode,
      decode: mod.decode,
    };
  } catch {
    throw new Error(
      '[Sthira] Failed to load @msgpack/msgpack. Install it with: pnpm add @msgpack/msgpack',
    );
  }
}

/**
 * Check if MessagePack is available
 */
export function isMsgpackAvailable(): boolean {
  return msgpackModule !== null;
}

/**
 * Get serializer by format
 */
export function getSerializer(format: SerializationFormat): Serializer {
  switch (format) {
    case 'msgpack':
      return msgpackSerializer;
    case 'json':
    default:
      return jsonSerializer;
  }
}

/**
 * Create a custom serializer
 */
export function createSerializer(
  encode: <T>(data: T) => Uint8Array,
  decode: <T>(buffer: Uint8Array) => T,
  format: SerializationFormat = 'json',
): Serializer {
  return { format, encode, decode };
}
