import { authOptions } from './auth';
import { LoginSchema } from '@/lib/validators';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
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

jest.mock('@/lib/validators', () => ({
  LoginSchema: {
    safeParse: jest.fn(),
  },
}));

const credentialsProvider = authOptions.providers.find(
  (p) => p.id === 'credentials'
);

if (!credentialsProvider || !('authorize' in credentialsProvider)) {
  throw new Error('Credentials provider or authorize function not found');
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

describe('Auth.js Configuration', () => {
  describe('CredentialsProvider - authorize function', () => {
    beforeEach(() => {
      // Reset mocks before each test
      (db.user.findUnique as jest.Mock).mockReset();
      (bcrypt.compare as jest.Mock).mockReset();
      (LoginSchema.safeParse as jest.Mock).mockReset();
    });

    it('should return user object with roles for valid credentials', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password123' };
      const mockUserFromDb = {
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: 'hashed-password',
        roles: [Role.USER, Role.ADMIN],
      };

      (LoginSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: mockCredentials });
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUserFromDb);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authorize(mockCredentials, {} as any); // Request object is not used in this authorize function

      expect(LoginSchema.safeParse).toHaveBeenCalledWith(mockCredentials);
      expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: mockCredentials.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(mockCredentials.password, mockUserFromDb.hashedPassword);
      expect(result).toEqual({
        id: mockUserFromDb.id,
        name: mockUserFromDb.name,
        email: mockUserFromDb.email,
        roles: mockUserFromDb.roles,
      });
    });

    it('should return null for invalid password', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'wrong-password' };
      const mockUserFromDb = {
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: 'hashed-password',
        roles: [Role.USER],
      };

      (LoginSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: mockCredentials });
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUserFromDb);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Password does not match

      const result = await authorize(mockCredentials, {} as any);

      expect(result).toBeNull();
    });

    it('should return null if user is not found', async () => {
      const mockCredentials = { email: 'notfound@example.com', password: 'password123' };

      (LoginSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: mockCredentials });
      (db.user.findUnique as jest.Mock).mockResolvedValue(null); // User not found

      const result = await authorize(mockCredentials, {} as any);

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if user has no hashed password', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password123' };
      const mockUserFromDb = {
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword: null, // No password set (e.g. OAuth user)
        roles: [Role.USER],
      };

      (LoginSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data: mockCredentials });
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUserFromDb);

      const result = await authorize(mockCredentials, {} as any);

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if credential validation fails', async () => {
      const mockCredentials = { email: 'invalid-email', password: 'short' }; // Invalid data
      (LoginSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: { flatten: () => ({ fieldErrors: { email: ['Invalid email'] } }) }, // Mocked error structure
      });

      const result = await authorize(mockCredentials, {} as any);

      expect(result).toBeNull();
      expect(db.user.findUnique).not.toHaveBeenCalled();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('Auth.js Callbacks - jwt', () => {
    const { jwt: jwtCallback } = authOptions.callbacks!;
    if (!jwtCallback) throw new Error('JWT callback not found');

    beforeEach(() => {
      (db.user.findUnique as jest.Mock).mockReset();
    });

    it('should add id and roles to token if user object with roles is provided (initial sign-in)', async () => {
      const mockUser = {
        id: 'user-id-jwt-1',
        name: 'JWT User',
        email: 'jwt@example.com',
        roles: [Role.USER, Role.ORGANIZER],
      } as any; // Cast to any to satisfy NextAuthUser type which might not have roles yet by default
      const mockToken = { anExistingProp: 'value' }; // An existing token, if any

      const result = await jwtCallback({ token: mockToken, user: mockUser, account: null, profile: undefined, trigger: "signIn", isNewUser: false });

      expect(result.id).toBe(mockUser.id);
      expect(result.roles).toEqual(mockUser.roles);
      expect(result.anExistingProp).toBe('value'); // Ensure existing token props are preserved
      expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch roles from DB if user object is provided without roles (initial sign-in)', async () => {
      const mockUserNoRoles = {
        id: 'user-id-jwt-2',
        name: 'JWT User No Roles',
        email: 'jwt-no-roles@example.com',
        // roles are missing
      } as any;
      const mockToken = {};
      const mockUserFromDbWithRoles = {
        id: 'user-id-jwt-2',
        roles: [Role.TALENT],
      };

      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUserFromDbWithRoles);

      const result = await jwtCallback({ token: mockToken, user: mockUserNoRoles, account: null, profile: undefined, trigger: "signIn", isNewUser: false });

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserNoRoles.id },
        select: { roles: true },
      });
      expect(result.id).toBe(mockUserNoRoles.id);
      expect(result.roles).toEqual(mockUserFromDbWithRoles.roles);
    });

    it('should handle user present, no roles on user, and no roles from DB', async () => {
      const mockUserNoRoles = {
        id: 'user-id-jwt-3',
      } as any;
      const mockToken = {};
      (db.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-id-jwt-3', roles: [] }); // DB returns empty roles

      const result = await jwtCallback({ token: mockToken, user: mockUserNoRoles, account: null, profile: undefined, trigger: "signIn", isNewUser: false });
      expect(result.id).toBe(mockUserNoRoles.id);
      expect(result.roles).toEqual([]);
    });
    
    it('should handle user present, no roles on user, and DB user not found', async () => {
      const mockUserNoRoles = {
        id: 'user-id-jwt-4',
      } as any;
      const mockToken = { existing: "prop"};
      (db.user.findUnique as jest.Mock).mockResolvedValue(null); // DB user not found

      const result = await jwtCallback({ token: mockToken, user: mockUserNoRoles, account: null, profile: undefined, trigger: "signIn", isNewUser: false });
      expect(result.id).toBe(mockUserNoRoles.id);
      expect(result.roles).toBeUndefined();
      expect(result.existing).toBe("prop");
    });

    it('should return the token unmodified if user is not provided (subsequent calls)', async () => {
      const mockToken = {
        id: 'existing-user-id',
        roles: [Role.ADMIN],
        someOtherProp: 'test',
      };
      // User is undefined for subsequent calls
      const result = await jwtCallback({ token: mockToken, user: undefined as any, account: null, profile: undefined, trigger: "update", isNewUser: false }); 

      expect(result).toEqual(mockToken);
      expect(db.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Auth.js Callbacks - session', () => {
    const { session: sessionCallback } = authOptions.callbacks!;
    if (!sessionCallback) throw new Error('Session callback not found');

    it('should add id and roles to session.user from token', async () => {
      const mockSession = {
        user: { name: 'Original Name', email: 'original@example.com' }, // Initial session user
        expires: 'some-date',
      } as any; // Cast to allow adding id/roles later and match Session type loosely
      const mockToken = {
        id: 'token-user-id-1',
        roles: [Role.ADMIN, Role.USER],
        someOtherTokenProp: 'test',
      };
      const mockAdapterUser = { id: 'adapter-user-id' } as any; // Mock AdapterUser, not directly used by our session callback

      const result = await sessionCallback({ session: mockSession, token: mockToken, user: mockAdapterUser, newSession: mockSession, trigger: "update" });

      expect((result.user as any)?.id).toBe(mockToken.id);
      expect((result.user as any)?.roles).toEqual(mockToken.roles);
      expect((result.user as any)?.name).toBe('Original Name'); // Ensure other props preserved
    });

    it('should add id to session.user if only id is in token', async () => {
      const mockSession = {
        user: { name: 'Test' },
        expires: 'some-date',
      } as any;
      const mockToken = { id: 'token-user-id-2' }; // No roles in token
      const mockAdapterUser = { id: 'adapter-user-id' } as any;

      const result = await sessionCallback({ session: mockSession, token: mockToken, user: mockAdapterUser, newSession: mockSession, trigger: "update" });

      expect((result.user as any)?.id).toBe(mockToken.id);
      expect((result.user as any)?.roles).toBeUndefined();
    });

    it('should add roles to session.user if only roles are in token (id might come from default)', async () => {
      const mockSession = {
        user: { id: 'original-session-id', name: 'Test' }, // Session might have an id already
        expires: 'some-date',
      } as any;
      const mockToken = { roles: [Role.ORGANIZER] }; // No id in token
      const mockAdapterUser = { id: 'adapter-user-id' } as any;

      const result = await sessionCallback({ session: mockSession, token: mockToken, user: mockAdapterUser, newSession: mockSession, trigger: "update" });
      
      expect((result.user as any)?.id).toBe('original-session-id'); // Original id preserved
      expect((result.user as any)?.roles).toEqual(mockToken.roles);
    });

    it('should handle token with no id and no roles', async () => {
      const mockSession = {
        user: { id: 'original-id', name: 'Test User No Change' },
        expires: 'some-date',
      } as any;
      const mockToken = { otherProp: 'value' }; // No id, no roles
      const mockAdapterUser = { id: 'adapter-user-id' } as any;

      const result = await sessionCallback({ session: mockSession, token: mockToken, user: mockAdapterUser, newSession: mockSession, trigger: "update" });

      expect((result.user as any)?.id).toBe('original-id');
      expect((result.user as any)?.roles).toBeUndefined();
      expect((result.user as any)?.name).toBe('Test User No Change');
    });

    it('should return session as is if session.user is undefined (defensive)', async () => {
      const mockSessionNoUser = {
        expires: 'some-date',
        user: undefined, // session.user is undefined
      } as any;
      const mockToken = { id: 'token-id', roles: [Role.USER] };
      const mockAdapterUser = { id: 'adapter-user-id' } as any;

      const result = await sessionCallback({ session: mockSessionNoUser, token: mockToken, user: mockAdapterUser, newSession: mockSessionNoUser, trigger: "update" });
      
      // The callback logic checks `if (session.user)`, so it shouldn't try to assign id/roles
      expect(result.user).toBeUndefined();
      expect(result).toEqual(mockSessionNoUser); // Session returned as is
    });
  });
}); 