import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/domain/entities/auth/UserProfile';
import type { IAuthRepository } from '@/domain/repositories/auth/auth_repository';

export interface CurrentUser {
  session: Session | null;
  profile: UserProfile | null;
}

export class GetCurrentUserUseCase {
  private authRepository: IAuthRepository;

  constructor(authRepository: IAuthRepository) {
    this.authRepository = authRepository;
  }

  async execute(): Promise<CurrentUser> {
    const session = await this.authRepository.getSession();
    if (!session) {
      return { session: null, profile: null };
    }

    const profile = await this.authRepository.getUserProfile(session.user.id);
    return { session, profile };
  }
}
