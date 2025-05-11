import { RegistrationSchema } from './validators';

describe('RegistrationSchema', () => {
  it('should validate a correct registration form', () => {
    const data = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should invalidate an invalid email', () => {
    const data = {
      email: 'invalid-email',
      password: 'password123',
      confirmPassword: 'password123',
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain('Invalid email address');
    }
  });

  it('should invalidate a short password', () => {
    const data = {
      email: 'test@example.com',
      password: 'short',
      confirmPassword: 'short',
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password must be at least 8 characters long'
      );
    }
  });

  it('should invalidate non-matching passwords', () => {
    const data = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password456',
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      // The error is attached to confirmPassword due to the .refine path
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "Passwords don't match"
      );
    }
  });

  it('should invalidate if confirmPassword is too short, even if passwords match initially before refine', () => {
    const data = {
      email: 'test@example.com',
      password: 'pass', // Will fail initial Zod schema for password field
      confirmPassword: 'pass', // Will fail initial Zod schema for confirmPassword field
    };
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password must be at least 8 characters long'
      );
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        'Password must be at least 8 characters long'
      );
      // No "Passwords don't match" error here because individual field validation fails first.
    }
  });

  it('should require email', () => {
    const data = {
      // email: undefined,
      password: 'password123',
      confirmPassword: 'password123',
    };
    // @ts-ignore to test missing property
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it('should require password', () => {
    const data = {
      email: 'test@example.com',
      // password: undefined,
      confirmPassword: 'password123',
    };
    // @ts-ignore to test missing property
    const result = RegistrationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });
}); 