import { createAuthClient } from "better-auth/react";

// Same-origin client without privileged plugins. Used by the partner surface
// and by the shared login/reset forms.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
