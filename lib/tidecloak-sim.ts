/**
 * TideCloak Simulation Adapter
 *
 * Implements simulated identity, document authorization, access requests,
 * approvals, revocations, and protected document viewing for the SecureDocs
 * hackathon demo. This adapter is used under Tide Foundation's official Plan C
 * (https://tide.org/unlocked/#plan-c) which authorizes simulated TideCloak
 * integration when the live network is unavailable.
 *
 * IMPORTANT: Everything in this module is a SIMULATION. No real cryptographic
 * operations, token validation, encryption, or secure key management occurs.
 * The simulated tokens, policies, and access checks do NOT provide real
 * security. They demonstrate intended behavior only.
 *
 * Architecture: This adapter is isolated behind the IdentityAdapter and
 * ProtectedContentAdapter interfaces defined in secure-boundary.ts, so it
 * can be replaced by a real TideCloak integration without changing the rest
 * of the application.
 */

import type { DemoDocument, DemoDocumentView, DemoRole } from "./demo-types.ts";
import type {
  VerifiedPrincipal,
  DocumentPermissionRecord,
  IdentityAdapter,
  ProtectedContentAdapter,
} from "./secure-boundary.ts";
import { canReadContent, canReadMetadata, canEdit } from "./secure-boundary.ts";

export type SimulatedUser = {
  subjectId: string;
  displayName: string;
  initials: string;
  role: DemoRole;
  administrator: boolean;
};

export const SIMULATED_USERS: Record<DemoRole, SimulatedUser> = {
  owner: {
    subjectId: "sim-alex-morgan",
    displayName: "Alex Morgan",
    initials: "AM",
    role: "owner",
    administrator: false,
  },
  collaborator: {
    subjectId: "sim-maya-chen",
    displayName: "Maya Chen",
    initials: "MC",
    role: "collaborator",
    administrator: false,
  },
  administrator: {
    subjectId: "sim-jordan-brooks",
    displayName: "Jordan Brooks",
    initials: "JB",
    role: "administrator",
    administrator: true,
  },
};

export type SimulatedToken = {
  iss: string;
  sub: string;
  name: string;
  roles: string[];
  iat: number;
  exp: number;
  simulated: true;
};

const SIMULATED_ISSUER = "http://localhost:8080/realms/securedocs";
const SIMULATED_TOKEN_LIFETIME_SECONDS = 300;

export function issueSimulatedToken(user: SimulatedUser): SimulatedToken {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: SIMULATED_ISSUER,
    sub: user.subjectId,
    name: user.displayName,
    roles: [user.role, ...(user.administrator ? ["realm-admin"] : [])],
    iat: now,
    exp: now + SIMULATED_TOKEN_LIFETIME_SECONDS,
    simulated: true,
  };
}

export function isTokenExpired(token: SimulatedToken): boolean {
  return Math.floor(Date.now() / 1000) > token.exp;
}

export class SimulatedIdentityAdapter implements IdentityAdapter {
  async authenticate(_request: Request): Promise<VerifiedPrincipal | null> {
    void _request;
    return null;
  }

  authenticateSimulated(role: DemoRole): VerifiedPrincipal {
    const user = SIMULATED_USERS[role];
    return {
      subjectId: user.subjectId,
      administrator: user.administrator,
    };
  }
}

export class SimulatedProtectedContentAdapter implements ProtectedContentAdapter {
  async assertReady(): Promise<void> {
  }

  simulateEncrypt(plaintext: string): SimulatedEncryptedPayload {
    const encoded = Buffer.from(plaintext, "utf-8").toString("base64");
    return {
      ciphertext: encoded,
      algorithm: "SIMULATED-BASE64-NOT-ENCRYPTION",
      keyId: "sim-document-key-" + Date.now(),
      simulated: true,
    };
  }

  simulateDecrypt(payload: SimulatedEncryptedPayload): string {
    if (!payload.simulated) {
      throw new Error("Cannot decrypt a non-simulated payload");
    }
    return Buffer.from(payload.ciphertext, "base64").toString("utf-8");
  }
}

export type SimulatedEncryptedPayload = {
  ciphertext: string;
  algorithm: string;
  keyId: string;
  simulated: true;
};

export type SimulatedAccessDecision = {
  allowed: boolean;
  reason: string;
  simulatedPolicyRule: string;
  wouldBeCryptographic: boolean;
};

export function evaluateAccess(
  principal: VerifiedPrincipal,
  document: DocumentPermissionRecord,
  operation: "read-metadata" | "read-content" | "edit" | "grant" | "revoke",
): SimulatedAccessDecision {
  switch (operation) {
    case "read-metadata":
      return {
        allowed: canReadMetadata(principal, document),
        reason: canReadMetadata(principal, document)
          ? "Principal has metadata visibility"
          : "Principal has no relationship to this document",
        simulatedPolicyRule: "metadata-visible-to-owner-viewer-admin",
        wouldBeCryptographic: false,
      };
    case "read-content":
      return {
        allowed: canReadContent(principal, document),
        reason: canReadContent(principal, document)
          ? "Principal is owner or granted viewer"
          : principal.administrator
            ? "Administrator cannot independently access document content"
            : "Principal is not an authorized viewer",
        simulatedPolicyRule: "content-decryption-requires-owner-or-grant",
        wouldBeCryptographic: true,
      };
    case "edit":
      return {
        allowed: canEdit(principal, document),
        reason: canEdit(principal, document)
          ? "Principal is the document owner"
          : "Only the document owner can edit",
        simulatedPolicyRule: "edit-requires-owner",
        wouldBeCryptographic: true,
      };
    case "grant":
    case "revoke":
      return {
        allowed: principal.subjectId === document.ownerId,
        reason: principal.subjectId === document.ownerId
          ? "Owner controls access grants"
          : "Only the document owner can modify access",
        simulatedPolicyRule: "grant-revoke-requires-owner",
        wouldBeCryptographic: true,
      };
  }
}

export type SimulatedDocumentView = DemoDocumentView & {
  accessDecision: SimulatedAccessDecision;
  simulatedToken: SimulatedToken;
};

export function viewDocumentWithSimulation(
  document: DemoDocument,
  role: DemoRole,
): SimulatedDocumentView {
  const user = SIMULATED_USERS[role];
  const token = issueSimulatedToken(user);
  const principal: VerifiedPrincipal = {
    subjectId: user.subjectId,
    administrator: user.administrator,
  };
  const permissionRecord: DocumentPermissionRecord = {
    ownerId: SIMULATED_USERS.owner.subjectId,
    viewerIds: document.collaboratorGranted
      ? [SIMULATED_USERS.collaborator.subjectId]
      : [],
  };

  const contentDecision = evaluateAccess(principal, permissionRecord, "read-content");
  const { body, ...metadata } = document;

  const access: DemoDocumentView["access"] =
    role === "owner"
      ? "owner"
      : role === "collaborator" && document.collaboratorGranted
        ? "collaborator"
        : role === "collaborator" && document.requestStatus === "pending"
          ? "pending"
          : "denied";

  return {
    ...metadata,
    body: contentDecision.allowed ? body : undefined,
    access,
    accessDecision: contentDecision,
    simulatedToken: token,
  };
}

export const EMERGENT_AUTHORITY_EXPLANATION = {
  concept:
    "Emergent Authority means no single party \u2014 not the administrator, not the " +
    "server operator, not any individual node \u2014 can unilaterally access protected " +
    "content. Access decisions emerge from the consensus of the Tide network, " +
    "requiring the document owner\u2019s explicit cryptographic approval.",
  simulatedBehavior:
    "In this demo, the administrator role (Jordan Brooks) can see document " +
    "metadata (title, owner, timestamps) but CANNOT view document content. " +
    "This demonstrates the intended trust boundary where administrative " +
    "privileges do not grant content access.",
  liveEnforcement: [
    {
      operation: "Document content encryption",
      simulated: "Base64 encoding (NOT encryption) used for demonstration",
      live: "Tide SDK end-to-end encryption with distributed key management",
    },
    {
      operation: "Identity verification",
      simulated: "Browser-selected role with no authentication",
      live: "OIDC authorization code flow with PKCE via TideCloak",
    },
    {
      operation: "Access grant/revoke",
      simulated: "Server-side flag toggle in local JSON file",
      live: "Cryptographic re-encryption via Tide network consensus",
    },
    {
      operation: "Administrator isolation",
      simulated: "Server-side policy check omits body from API response",
      live: "Administrator never possesses decryption key material; enforced by Tide network",
    },
    {
      operation: "Token validation",
      simulated: "Fake JWT-like object with no signature verification",
      live: "RS256/ES256 signature verification against TideCloak JWKS endpoint",
    },
  ],
} as const;

export type SimulationMetadata = {
  mode: "simulation";
  planC: true;
  planCReference: string;
  disclaimer: string;
  tideCloakConnected: false;
};

export function getSimulationMetadata(): SimulationMetadata {
  return {
    mode: "simulation",
    planC: true,
    planCReference: "https://tide.org/unlocked/#plan-c",
    disclaimer:
      "This is a simulated TideCloak integration under Tide Foundation\u2019s " +
      "official Plan C authorization. No real cryptographic security, token " +
      "validation, encryption, or administrator restrictions are enforced. " +
      "All access decisions are illustrative only.",
    tideCloakConnected: false,
  };
}
