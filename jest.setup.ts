import '@testing-library/jest-dom';

// Polyfill/Mock Web Standard APIs not available in JSDOM/Node by default
if (typeof global.Request === 'undefined') {
  global.Request = class Request { 
    // Basic mock implementation - expand as needed by tests
    url: string;
    headers: Headers;
    constructor(input: string | URL | Request, init?: RequestInit) {
        this.url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
        this.headers = new Headers(init?.headers);
        // Add other properties/methods used by your code (e.g., json(), text(), method)
    }
    async json() { return {}; }
    async text() { return ''; }
    // Add other methods like clone(), etc. if necessary
  } as any;
}

if (typeof global.Response === 'undefined') {
    global.Response = class Response {
        // Basic mock implementation
        status: number;
        headers: Headers;
        body: any;
        constructor(body?: BodyInit | null, init?: ResponseInit) {
            this.status = init?.status || 200;
            this.headers = new Headers(init?.headers);
            this.body = body;
        }
        async json() { return JSON.parse(this.body as string); }
        async text() { return this.body as string; }
        static json(data: any, init?: ResponseInit) {
            const body = JSON.stringify(data);
            const headers = new Headers(init?.headers);
            if (!headers.has('content-type')) {
                headers.set('content-type', 'application/json');
            }
            return new Response(body, { ...init, headers });
        }
    } as any;
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    private _headers: Record<string, string> = {};
    constructor(init?: HeadersInit) {
        if (init) {
            if (init instanceof Headers) {
                init.forEach((value, key) => { this._headers[key.toLowerCase()] = value; });
            } else if (Array.isArray(init)) {
                init.forEach(([key, value]) => { this._headers[key.toLowerCase()] = value; });
            } else {
                Object.entries(init).forEach(([key, value]) => { this._headers[key.toLowerCase()] = value; });
            }
        }
    }
    append(name: string, value: string): void { this._headers[name.toLowerCase()] = value; }
    delete(name: string): void { delete this._headers[name.toLowerCase()]; }
    get(name: string): string | null { return this._headers[name.toLowerCase()] || null; }
    has(name: string): boolean { return name.toLowerCase() in this._headers; }
    set(name: string, value: string): void { this._headers[name.toLowerCase()] = value; }
    forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void {
        Object.entries(this._headers).forEach(([key, value]) => callbackfn.call(thisArg, value, key, this));
    }
    // Add other methods if needed (entries, keys, values)
  } as any;
}

// Mock NextResponse (specific to Next.js)
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'), // Preserve other exports
  NextResponse: {
    json: jest.fn((body, init) => {
      // Return a mock Response-like object suitable for testing
      return {
        status: init?.status || 200,
        headers: new Headers(init?.headers),
        json: async () => body,
        text: async () => JSON.stringify(body),
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      };
    }),
    // Mock other NextResponse static methods if needed (redirect, rewrite, etc.)
  },
  // Mock NextRequest if needed, similar to global.Request polyfill
})); 