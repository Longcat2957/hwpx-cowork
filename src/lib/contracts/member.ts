export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'active' | 'invited' | 'disabled';

export interface Member {
    id: string;
    name: string;
    email: string;
    role: MemberRole;
    status: MemberStatus;
    initials: string;
    color: string;
    invitationToken?: string;
}
