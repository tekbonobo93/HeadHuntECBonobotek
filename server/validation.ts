import { z } from "zod";

export const emailSchema = z.string().trim().email("Ingresa un correo electronico valido.");
export const passwordSchema = z.string().min(8, "La contrasena debe tener al menos 8 caracteres.");
export const nameSchema = z.string().trim().min(2, "Ingresa un nombre valido.");
export const tokenSchema = z.string().trim().min(1, "Token invalido.");

export const registerBodySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Correo y contrasena son obligatorios."),
});

export const emailBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export const verifyTokenBodySchema = z.object({
  token: tokenSchema,
});

export const statePatchSchema = z.record(z.string(), z.unknown());
