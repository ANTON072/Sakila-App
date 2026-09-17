import z from "zod";

export const loginSchema = z.object({
  username: z.string("Username is required").min(1, "Username is required"),
  password: z.string("Password is required").min(1, "Password is required"),
});
