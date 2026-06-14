import { usersService } from '@/services/api/users.service';

export const getPresenceDirectoryUsersPage = (
  pageSize: number,
  offset: number
) => usersService.getUsersPage(pageSize, offset);
