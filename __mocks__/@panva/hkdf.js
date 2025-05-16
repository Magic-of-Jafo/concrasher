const hkdf = jest.fn().mockResolvedValue(new Uint8Array(32)); // Mock to return a Uint8Array, as HKDF often does for keys
 
module.exports = {
  default: hkdf, // Assuming it's used as a default import
  derive: hkdf,  // Also providing 'derive' if it's a named import
}; 