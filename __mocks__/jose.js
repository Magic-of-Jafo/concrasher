module.exports = {
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setIssuer: jest.fn().mockReturnThis(),
    setAudience: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mocked-jwt-token'),
  })),
  jwtVerify: jest.fn().mockResolvedValue({ payload: { mock: 'payload' } }),
  importPKCS8: jest.fn().mockResolvedValue('mocked-private-key'),
  importSPKI: jest.fn().mockResolvedValue('mocked-public-key'),
  createRemoteJWKSet: jest.fn().mockImplementation((url) => {
    // This function is expected to return a function that can be called with (protectedHeader, token)
    // For simplicity, just return a jest.fn() that resolves to a mock key.
    return jest.fn().mockResolvedValue({ alg: 'RS256', use: 'sig' }); // Example mock key
  }),
  // A generic fallback for any other functions that might be dynamically called
  // This is a bit of a catch-all and might hide issues if specific mocks are needed.
  // Use with caution or expand with more specific mocks as errors arise.
  // __esModule: true, // If jose is treated as an ES module by the importer
  // default: jest.fn(), // If there's a default export being used
}; 