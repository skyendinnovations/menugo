export interface InviteMemberDTO {
  email: string;
  roleIds: number[];
}

export interface AcceptInvitationDTO {
  token: string;
}
