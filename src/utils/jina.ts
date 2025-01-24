import {log} from "../config/logging.ts"
import {isJinaAvailable, getJinaApiKey} from "../config/settings.ts"

interface JinaResponse {
    data: unknown
}

async function jinaFetch(endpoint: string, url: string): Promise<string> {
    if (!isJinaAvailable()) {
        throw new Error("Jina API key not configured. Use 'settings --set-jina-key YOUR_KEY' to configure.")
    }

    const jinaApiEndpoint = `https://${endpoint}.jina.ai/${url}`
    log.info(`Fetching ${jinaApiEndpoint}`)
    const response = await fetch(jinaApiEndpoint, {
        headers: {
            Authorization: `Bearer ${getJinaApiKey()}`
        }
    })

    if (!response.ok) {
        throw new Error(`Jina API error: ${response.statusText}`)
    }
    log.info(`fetched ${jinaApiEndpoint}`)

    return await response.text()
}

export async function readPage(url: string): Promise<string> {
    return await jinaFetch('r', encodeURIComponent(url))
}

export async function search(searchTerm: string): Promise<string> {
    return await jinaFetch('s', searchTerm)
}

export async function searchGrounding(searchTerm: string): Promise<string> {
    return await jinaFetch('g', searchTerm)
}
