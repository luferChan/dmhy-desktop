import axios from 'axios'
import * as cheerio from 'cheerio'

export interface Resource {
  id: string
  title: string
  detailUrl: string
  publishTime: string
  publisher: string
  publisherUrl: string
  teamId: string
  category: string
  size: string
  magnetUrl: string
  torrentUrl: string
}

export interface SearchResult {
  resources: Resource[]
  page: number
  hasMore: boolean
}

const BASE_URL = 'https://dmhy.org'
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8'
}

let currentProxyUrl = ''

export function setScraperProxy(proxyUrl: string): void {
  currentProxyUrl = proxyUrl
}

function buildAxiosConfig(): object {
  const config: Record<string, unknown> = {
    headers: DEFAULT_HEADERS,
    timeout: 20000
  }
  if (currentProxyUrl) {
    try {
      const u = new URL(currentProxyUrl)
      config.proxy = {
        protocol: u.protocol.replace(':', ''),
        host: u.hostname,
        port: parseInt(u.port) || (u.protocol === 'https:' ? 443 : 80)
      }
    } catch {
      // ignore invalid proxy URL
    }
  }
  return config
}

let lastRequestTime = 0
async function throttledGet(url: string): Promise<string> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < 1000) {
    await new Promise((r) => setTimeout(r, 1000 - elapsed))
  }
  lastRequestTime = Date.now()
  const res = await axios.get(url, buildAxiosConfig())
  return res.data
}

export async function searchResources(
  keyword: string,
  page = 1,
  sortId = 2,
  teamId?: string
): Promise<SearchResult> {
  const base = teamId
    ? `${BASE_URL}/topics/list/team_id/${teamId}/page/${page}`
    : `${BASE_URL}/topics/list/page/${page}`
  const query = keyword.trim()
    ? `keyword=${encodeURIComponent(keyword)}&sort_id=${sortId}&order=date-desc`
    : `sort_id=${sortId}&order=date-desc`
  const url = `${base}?${query}`
  const html = await throttledGet(url)
  const $ = cheerio.load(html)

  const resources: Resource[] = []

  // Correct selector: table.tablesorter (not topic-list)
  $('table.tablesorter tbody tr').each((_, row) => {
    const $row = $(row)
    const $tds = $row.find('td')
    if ($tds.length < 5) return

    // td[0]: date — hidden span has exact datetime
    const $dateTd = $tds.eq(0)
    const publishTime =
      $dateTd.find('span[style*="display: none"]').text().trim() ||
      $dateTd.text().trim().replace(/\s+/g, ' ')

    // td[1]: category
    const category = $tds.eq(1).find('a').text().trim()

    // td[2]: title td — publisher in span.tag a, title in a[href*=/topics/view/]
    const $titleTd = $tds.eq(2)
    const $titleLink = $titleTd.find('a[href*="/topics/view/"]')
    const $publisherLink = $titleTd.find('span.tag a')
    const title = $titleLink.text().trim()
    const detailHref = $titleLink.attr('href') || ''
    if (!title || !detailHref) return

    const publisher = $publisherLink.text().trim()
    const publisherUrl = $publisherLink.attr('href') || ''
    const teamIdMatch = publisherUrl.match(/team_id\/(\d+)/)
    const teamId = teamIdMatch ? teamIdMatch[1] : ''

    const idMatch = detailHref.match(/\/topics\/view\/([^_/]+)/)
    const id = idMatch ? idMatch[1] : detailHref

    // td[3]: magnet & torrent links
    const $linkTd = $tds.eq(3)
    const magnetUrl = $linkTd.find('a[href^="magnet:"]').attr('href') || ''
    const torrentHref = $linkTd.find('a[href$=".torrent"]').attr('href') || ''
    const torrentUrl = torrentHref
      ? torrentHref.startsWith('http')
        ? torrentHref
        : `${BASE_URL}${torrentHref}`
      : ''

    // td[4]: file size
    const size = $tds.eq(4).text().trim()

    resources.push({
      id,
      title,
      detailUrl: detailHref.startsWith('http') ? detailHref : `${BASE_URL}${detailHref}`,
      publishTime,
      publisher,
      publisherUrl: publisherUrl.startsWith('http') ? publisherUrl : publisherUrl ? `${BASE_URL}${publisherUrl}` : '',
      teamId,
      category,
      size,
      magnetUrl,
      torrentUrl
    })
  })

  const hasMore = resources.length >= 30

  return { resources, page, hasMore }
}

export async function getResourceDetail(detailUrl: string): Promise<string> {
  const html = await throttledGet(detailUrl)
  const $ = cheerio.load(html)
  return $('a[href^="magnet:"]').first().attr('href') || ''
}

export async function getResourceFiles(detailUrl: string): Promise<string[]> {
  const html = await throttledGet(detailUrl)
  const $ = cheerio.load(html)
  const files: string[] = []
  const sizeOnly = /^\d+(\.\d+)?\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)i?$/i

  // ul.file_list > li: each li has img + filename text node + span.file_size
  $('ul.file_list > li').each((_, el) => {
    const $clone = $(el).clone()
    $clone.find('.file_size, .size, font').remove()
    const name = $clone.text().trim()
    if (name && !sizeOnly.test(name)) files.push(name)
  })
  return files
}
