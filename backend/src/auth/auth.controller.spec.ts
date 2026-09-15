import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: any;

  beforeEach(async () => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should call authService.register with correct data', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        role: 'CUSTOMER' as const,
        firstName: 'John',
        lastName: 'Doe',
      };
      service.register.mockResolvedValue({ userId: '1', email: 'test@example.com', requiresVerification: true });

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ userId: '1', email: 'test@example.com', requiresVerification: true });
    });
  });

  describe('login', () => {
    it('should call authService.login with correct data', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      service.login.mockResolvedValue({ accessToken: 'token', user: { id: '1' } });

      const result = await controller.login(dto);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ accessToken: 'token', user: { id: '1' } });
    });
  });

  describe('getProfile', () => {
    it('should call authService.getProfile with userId', async () => {
      service.getProfile.mockResolvedValue({ id: '1', email: 'test@example.com' });

      const result = await controller.getProfile('user-1');

      expect(service.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ id: '1', email: 'test@example.com' });
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      const result = await controller.logout();

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
