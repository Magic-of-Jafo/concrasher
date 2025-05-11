import { authOptions } from './auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client'; // Import User type for mockUser
// import { NextApiRequest } from 'next'; // For the request object - using simpler MockRequest

// Mock Prisma and bcryptjs
// Note: The exact path for bcryptjs might differ based on package manager and monorepo structure.
// If 'bcryptjs' itself doesn't work, you might need a more specific path like '../node_modules/bcryptjs' or similar.
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const credentialsProvider = authOptions.providers.find(
  (provider: any) => provider.id === 'credentials' // Add any type for provider if needed
);

// Type guard to ensure provider and authorize are defined
if (!credentialsProvider || !('authorize' in credentialsProvider) || typeof credentialsProvider.authorize !== 'function') {
  throw new Error('Credentials provider or authorize function not found or not a function');
}

const authorize = credentialsProvider.authorize;

// Define a minimal request type if NextApiRequest is too broad or causes issues
interface MockRequest {
  headers?: Record<string, string | string[] | undefined>;
  body?: any;
  query?: any;
  cookies?: any;
  method?: string;
}

describe('Auth.js authorize function', () => {
  let mockDbUserFindUnique: jest.Mock;
  let mockBcryptCompare: jest.Mock;

  beforeEach(() => {
    // Assign mocks before each test and clear them
    mockDbUserFindUnique = db.user.findUnique as jest.Mock;
    mockBcryptCompare = bcrypt.compare as jest.Mock;
    mockDbUserFindUnique.mockClear();
    mockBcryptCompare.mockClear();
  });

  it('should return user object for correct credentials', async () => {
    const mockExistingUser: Partial<User> = {
      id: '1',
      email: 'test@example.com',
      hashedPassword: 'hashedPasswordValue',
      name: 'Test User',
    };
    mockDbUserFindUnique.mockResolvedValue(mockExistingUser);
    mockBcryptCompare.mockResolvedValue(true);

    const testCredentials = { email: 'test@example.com', password: 'password123' };
    const mockReq: MockRequest = { method: 'POST' }; // Minimal request object
    const result = await authorize(testCredentials, mockReq as any);

    expect(mockDbUserFindUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(mockBcryptCompare).toHaveBeenCalledWith('password123', 'hashedPasswordValue');
    expect(result).toEqual({ id: '1', name: 'Test User', email: 'test@example.com' });
  });

  it('should return null for incorrect password', async () => {
    const mockExistingUserWithWrongPass: Partial<User> = {
      id: '1',
      email: 'test@example.com',
      hashedPassword: 'hashedPasswordValue',
    };
    mockDbUserFindUnique.mockResolvedValue(mockExistingUserWithWrongPass);
    mockBcryptCompare.mockResolvedValue(false);

    const testCredentialsWrongPass = { email: 'test@example.com', password: 'wrongpassword' };
    const mockReq: MockRequest = { method: 'POST' };
    const result = await authorize(testCredentialsWrongPass, mockReq as any);

    expect(result).toBeNull();
  });

  it('should return null if user is not found', async () => {
    mockDbUserFindUnique.mockResolvedValue(null);

    const testCredentialsNonExistentUser = { email: 'nonexistent@example.com', password: 'password123' };
    const mockReq: MockRequest = { method: 'POST' };
    const result = await authorize(testCredentialsNonExistentUser, mockReq as any);

    expect(result).toBeNull();
  });

  it('should return null if user exists but has no hashedPassword', async () => {
    const mockUserNoPass: Partial<User> = { 
        id: '1', 
        email: 'test@example.com', 
        hashedPassword: null, 
        name: 'Test User' 
    };
    mockDbUserFindUnique.mockResolvedValue(mockUserNoPass);

    const testCredentialsUserNoPass = { email: 'test@example.com', password: 'password123' };
    const mockReq: MockRequest = { method: 'POST' };
    const result = await authorize(testCredentialsUserNoPass, mockReq as any);

    expect(mockDbUserFindUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(mockBcryptCompare).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

   it('should return null for invalid input (schema validation fail - missing email)', async () => {
    const testCredentialsMissingEmail = { password: 'password123' }; 
    const mockReq: MockRequest = { method: 'POST' };
    // Passing potentially incomplete credentials; Zod inside authorize should handle this.
    const result = await authorize(testCredentialsMissingEmail as any, mockReq as any);
    expect(result).toBeNull(); 
  });

  it('should return null for invalid input (schema validation fail - missing password)', async () => {
    const testCredentialsMissingPassword = { email: 'test@example.com' }; 
    const mockReq: MockRequest = { method: 'POST' };
    // Passing potentially incomplete credentials; Zod inside authorize should handle this.
    const result = await authorize(testCredentialsMissingPassword as any, mockReq as any);
    expect(result).toBeNull(); 
  });
}); 