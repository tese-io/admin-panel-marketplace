import { createClient, MatrixClient } from "matrix-js-sdk";

import { sdk } from "../client";

export type MatrixCredentials = {
  access_token: string;
  user_id: string;
  homeserver_url: string;
};

/**
 * Mint a Matrix session for the shared marketplace support identity
 * (`@mp_admin`) — all admin users act as this one user, mirroring the
 * synthetic "admin" TalkJS user.
 */
export const fetchMatrixCredentials = (): Promise<MatrixCredentials> =>
  sdk.client.fetch("/admin/matrix/token", { method: "POST" });

export const createMatrixSession = async (): Promise<MatrixClient> => {
  const creds = await fetchMatrixCredentials();

  const client = createClient({
    baseUrl: creds.homeserver_url,
    accessToken: creds.access_token,
    userId: creds.user_id,
    useAuthorizationHeader: true,
  });

  await client.startClient({ initialSyncLimit: 20, lazyLoadMembers: true });

  return client;
};
