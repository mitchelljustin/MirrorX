import Dotenv from 'dotenv'
import FS from 'fs'
import Path from 'path'

const PATHS = [
    '/run/secrets/secrets.env',
    './config/secrets.env',
]
export default function loadSecrets() {
    let path = null
    for (const candidate of PATHS) {
        if (FS.existsSync(candidate)) {
            path = candidate
            break
        }
    }
    if (path === null) {
        throw new Error("Can't find secrets")
    }
    Dotenv.config({ path })
}