import { and, eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { clientRedirectUrisTable, clienttable } from "../db/schema.js"


export async function findActiveClientByClientId(clientId: string) {
    const [client] = await db.select().from(clienttable).where(and(eq(clienttable.clientId, clientId),
        eq(clienttable.isActive, true)),).limit(1);

    return client ?? null;
}

export async function isRedirectUriAllowed(clientPk: string, redirectUri: string) {
    const [redirect] = await db
        .select().from(clientRedirectUrisTable).where(
            and(
                eq(clientRedirectUrisTable.clientPk, clientPk),
                eq(clientRedirectUrisTable.redirectUri, redirectUri)
            )
        ).limit(1);
   //here limit one means only one ow is needed 

    return Boolean(redirect);
}