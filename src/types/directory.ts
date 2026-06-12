export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  profilephoto: string | null;
  profilephoto_thumb?: string | null;
  last_message?: string | null;
  last_message_created_at?: string | null;
}

export interface DirectoryPageData<
  TUser extends DirectoryUser = DirectoryUser,
> {
  users: TUser[];
  hasMore: boolean;
}

export interface DirectoryPageResponse<
  TUser extends DirectoryUser = DirectoryUser,
> {
  data: DirectoryPageData<TUser> | null;
  error: unknown;
}
