import { AuthUser } from "../types";

export function isAdminUser(user: AuthUser | null | undefined): user is AuthUser & { role: "admin" } {
  return Boolean(user && user.role === "admin");
}

export function isStandardUser(user: AuthUser | null | undefined): user is AuthUser & { role: "user" } {
  return Boolean(user && user.role === "user");
}

export function assertAdminUser(user: AuthUser | null | undefined): asserts user is AuthUser & { role: "admin" } {
  if (!isAdminUser(user)) {
    throw new Error("Acceso administrativo no autorizado.");
  }
}
