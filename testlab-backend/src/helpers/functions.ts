import { ProjectStatus } from '_prisma/enums';

// ----------------------- HELPERS -----------------------

export function getStatusClass(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.ACTIVE:
      return 'active';
    case ProjectStatus.COMPLETED:
      return 'completed';
    case ProjectStatus.ON_HOLD:
      return 'on-hold';
    case ProjectStatus.ARCHIVED:
      return 'archived';
    default:
      return '';
  }
}

export function formatStatus(status: ProjectStatus): string {
  return status.replace(/_/g, ' ');
}
