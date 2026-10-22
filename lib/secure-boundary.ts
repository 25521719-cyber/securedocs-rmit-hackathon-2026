// Contract for the future authenticated service. This module never invents an identity.
export type VerifiedPrincipal = {
  subjectId: string;
  administrator: boolean;
};

export type DocumentPermissionRecord = {
  ownerId: string;
  viewerIds: string[];
};

export interface IdentityAdapter {
  authenticate(request: Request): Promise<VerifiedPrincipal | null>;
}

// The Tide E2EE envelope and SDK calls are deliberately not guessed here.
// The eventual implementation must handle protected content without sending
// demo plaintext through the production document route.
export interface ProtectedContentAdapter {
  assertReady(): Promise<void>;
}

export type ProductionServices = {
  identity: IdentityAdapter;
  protectedContent: ProtectedContentAdapter;
};

export class IntegrationUnavailable extends Error {}

export function requireProductionServices(): ProductionServices {
  throw new IntegrationUnavailable("TideCloak identity and protected content are not configured");
}

export function canReadMetadata(principal: VerifiedPrincipal, document: DocumentPermissionRecord) {
  return principal.administrator || principal.subjectId === document.ownerId || document.viewerIds.includes(principal.subjectId);
}

export function canReadContent(principal: VerifiedPrincipal, document: DocumentPermissionRecord) {
  return principal.subjectId === document.ownerId || document.viewerIds.includes(principal.subjectId);
}

export function canEdit(principal: VerifiedPrincipal, document: DocumentPermissionRecord) {
  return principal.subjectId === document.ownerId;
}
