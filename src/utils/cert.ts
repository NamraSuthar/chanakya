import "dotenv/config"
import { readFileSync } from "node:fs"
import path from "node:path"

function readKeyFromFile(filePath: string){
    return readFileSync(path.resolve(filePath)).toString();
}

const privateKeyFromEnv = process.env.PRIVATE_KEY_PEM
const publicKeyFromEnv = process.env.PUBLIC_KEY_PEM


export const PRIVATE_KEY = privateKeyFromEnv ? privateKeyFromEnv: readKeyFromFile("cert/private-key.pem")
export const PUBLIC_KEY = publicKeyFromEnv ? publicKeyFromEnv: readKeyFromFile("cert/public-key.pub")

