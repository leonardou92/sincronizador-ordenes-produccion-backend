import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Usuario y contraseña son obligatorios"),
  password: z.string().min(1, "Usuario y contraseña son obligatorios"),
});

export type LoginInput = z.infer<typeof loginSchema>;
