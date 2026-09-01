import type { ReactNode } from 'react';
import type { Role } from '@/domain/entities/auth/UserProfile';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { profile } = useAuth();

  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
