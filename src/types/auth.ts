export type AuthUserResponse = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string | null;
  cargo: string | null;
  cedula: string | null;
  authSource: string;
  role: {
    id: number;
    roleName: string;
    description: string | null;
  } | null;
};

export type LoginResult = {
  token: string;
  user: AuthUserResponse;
};
