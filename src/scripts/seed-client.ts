import "dotenv/config"
import { db } from "../db/index.js"
import { clientRedirectUrisTable, clienttable } from "../db/schema.js"
import { error } from "node:console";



async function seedClient() {
    const [client] = await db.insert(clienttable).values({
        name: "testcase name",
        clientId: "test-case",
        clientSecret: "top-secret-only",
        clientType: "confidential",
        isActive: true
    }).returning();
//returning return the inserted row 
if(!client){
    throw new error({message: "no client"})
}
    await db.insert(clientRedirectUrisTable).values({
        clientPk: client.id,
        redirectUri: "https://localhost:3000/callback",
    });
    console.log("Seeded client successfully:", client);
}

seedClient().then(() => process.exit(0)).catch((e) => {
    console.error("failed:", e)
    process.exit(1);
})