module.exports = {
  v1: jest.fn(() => 'mock-uuid-v1'),
  v3: jest.fn(() => 'mock-uuid-v3'),
  v4: jest.fn(() => 'mock-uuid-v4'), // Most commonly used
  v5: jest.fn(() => 'mock-uuid-v5'),
  NIL: '00000000-0000-0000-0000-000000000000',
  parse: jest.fn((uuidString) => Buffer.from(uuidString.replace(/-/g, ''), 'hex')),
  stringify: jest.fn((buffer) => {
    const hex = buffer.toString('hex');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
  }),
  validate: jest.fn((uuidString) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuidString)),
  version: jest.fn((uuidString) => {
    if (!module.exports.validate(uuidString)) throw new TypeError('Invalid UUID');
    const buffer = module.exports.parse(uuidString);
    return buffer[6] >> 4;
  }),
}; 