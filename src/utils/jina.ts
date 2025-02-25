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

    const headers = {
        Authorization: `Bearer ${getJinaApiKey()}`,
        'X-Return-Format': 'markdown',

    }

    let response = await fetch(jinaApiEndpoint, {headers})
    
    // If we get a 403, retry once with X-No-Cache header
    if (response.status === 403) {
        log.info('Got 403, retrying with X-No-Cache header')
        response = await fetch(jinaApiEndpoint, {
            headers: {
                ...headers,
                'X-No-Cache': 'true'
            }
        })
    }

    if (!response.ok) {
        throw new Error(`Jina API error: ${response.statusText}`)
    }
    log.info(`fetched ${jinaApiEndpoint}`)

    return await response.text()
}

export async function readPage(url: string): Promise<string> {
    return await jinaFetch('r', url)
}

export async function search(searchTerm: string): Promise<string> {
    return await jinaFetch('s', searchTerm)
}

export async function searchGrounding(searchTerm: string): Promise<string> {
    return await jinaFetch('g', searchTerm)
}
