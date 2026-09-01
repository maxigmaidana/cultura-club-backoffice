import type { IAuthRepository } from '@/domain/repositories/auth/auth_repository';

export class LoginUseCase {
  private authRepository: IAuthRepository;

  constructor(authRepository: IAuthRepository) {
    this.authRepository = authRepository;
  }

  async execute(email: string, password: string): Promise<void> {
    if (!email.trim() || !password.trim()) {
      throw new Error('Email y contraseña son obligatorios.');
    }

    await this.authRepository.login(email.trim(), password);
  }
}
