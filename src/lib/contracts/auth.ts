export interface InvitationInput {
    name: string;
    password: string;
}

export type GatewayErrorCode =
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION'
    | 'CONFLICT'
    | 'UNAVAILABLE'
    | 'INVITATION_EXPIRED'
    | 'INVITATION_USED';
