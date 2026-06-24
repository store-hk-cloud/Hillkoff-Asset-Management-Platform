export interface InvitationEmail {
  readonly to: string;
  readonly displayName: string;
  readonly invitationUrl: string;
  readonly expiresAt: Date;
}

export interface EmailProvider {
  sendUserInvitation(input: InvitationEmail): Promise<void>;
}
