import { describe, expect, it } from "vitest";

import { UserManagementError } from "@/domain/errors/user-management.error";
import { UserInvitationService } from "@/domain/services/user-invitation.service";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new UserInvitationService();
const now = new Date("2026-06-20T00:00:00.000Z");

describe("UserInvitationService", () => {
  it("creates a single-use invitation that expires after 72 hours", () => {
    const provision = service.create(
      createUserId("user-1"),
      " Employee@Hillkoff.com ",
      "Employee",
      createUserId("admin-1"),
      now,
    );
    expect(provision.token).not.toBe(provision.invitation.tokenHash);
    expect(provision.invitation.email).toBe("employee@hillkoff.com");
    expect(provision.invitation.expiresAt.toISOString()).toBe(
      "2026-06-23T00:00:00.000Z",
    );
    expect(service.hashToken(provision.token)).toBe(
      provision.invitation.tokenHash,
    );
  });

  it("rejects expired and already-used invitations", () => {
    const provision = service.create(
      createUserId("user-1"),
      "employee@hillkoff.com",
      "Employee",
      createUserId("admin-1"),
      now,
    );
    expect(() =>
      service.verify(
        provision.invitation,
        new Date("2026-06-23T00:00:00.001Z"),
      ),
    ).toThrow(UserManagementError);
    expect(() =>
      service.verify({ ...provision.invitation, status: "used" }, now),
    ).toThrow(UserManagementError);
  });
});
