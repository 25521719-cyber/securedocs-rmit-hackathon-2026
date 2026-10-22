export type DemoRole = "owner" | "collaborator" | "administrator";
export type RequestStatus = "none" | "pending" | "approved";

export type DemoDocument = {
  id: string;
  title: string;
  body: string;
  owner: string;
  updatedAt: string;
  requestStatus: RequestStatus;
  collaboratorGranted: boolean;
};

export type DemoDocumentView = Omit<DemoDocument, "body"> & {
  body?: string;
  access: "owner" | "collaborator" | "pending" | "denied";
};

export type DemoState = { documents: DemoDocument[]; step: number };

export const DEMO_PEOPLE = {
  owner: { name: "Alex Morgan", initials: "AM" },
  collaborator: { name: "Maya Chen", initials: "MC" },
  administrator: { name: "Jordan Brooks", initials: "JB" },
} as const;
