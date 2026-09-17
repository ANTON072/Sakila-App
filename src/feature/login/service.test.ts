import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { authenticateStaff } from "./service";

class RollbackError extends Error {}

describe("authenticateStaff", () => {
  const defaultCredential = {
    username: "Mike",
    password: process.env.SEED_PASSWORD,
  };

  test("ユーザー情報が返る", async () => {
    await db.transaction(async (tx) => {
      // Arrange
      // Act
      const result = await authenticateStaff(defaultCredential, tx);
      // Assert
      expect(result.id).toBe("1");
    });
  });

  test("スタッフがいない場合は例外発生", async () => {
    await db.transaction(async (tx) => {
      // Arrange
      const credential = { ...defaultCredential, username: "a" };
      // Act & Assert
      await expect(authenticateStaff(credential, tx)).rejects.toThrow(
        /Invalid credentials/,
      );
    });
  });

  test("スタッフが無効な場合は例外発生", async () => {
    await db
      .transaction(async (tx) => {
        // Arrange
        await tx
          .update(staff)
          .set({ active: false })
          .where(eq(staff.username, "Mike"));

        // Act & Assert
        await expect(authenticateStaff(defaultCredential, tx)).rejects.toThrow(
          /Invalid credentials/,
        );

        // Rollback
        throw new RollbackError();
      })
      .catch((err) => {
        if (!(err instanceof RollbackError)) throw err;
      });
  });

  test("パスワードが間違っている場合は例外発生", async () => {
    await db.transaction(async (tx) => {
      // Arrange
      const credential = { ...defaultCredential, password: "a" };
      // Act & Assert
      await expect(authenticateStaff(credential, tx)).rejects.toThrow(
        /Invalid credentials/,
      );
    });
  });
});
