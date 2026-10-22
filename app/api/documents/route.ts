import { requireProductionServices } from "@/lib/secure-boundary";

// Every production request enters through the identity adapter. It currently fails
// closed until TideCloak and encrypted storage are verified end to end.
const unavailable = async (request: Request) => {
  try {
    const services = requireProductionServices();
    await services.protectedContent.assertReady();
    await services.identity.authenticate(request);
  } catch { /* integration unavailable; no document operation is allowed */ }
  return Response.json(
    { error: "Secure document service unavailable: TideCloak is not connected" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
};
export const GET = unavailable;
export const POST = unavailable;
export const PATCH = unavailable;
export const DELETE = unavailable;
