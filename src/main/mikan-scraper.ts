import axios from 'axios'
import * as cheerio from 'cheerio'
import type { Resource, SearchResult } from './scraper'

const BASE_URL = 'https://mikanani.me'
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8'
}

const PAGE_SIZE = 30

let currentProxyUrl = ''

export function setMikanProxy(proxyUrl: string): void {
  currentProxyUrl = proxyUrl
}

function buildAxiosConfig(): object {
  const config: Record<string, unknown> = {
    headers: DEFAULT_HEADERS,
    timeout: 25000
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

function extractHash(href: string): string {
  const m = href.match(/\/Home\/Episode\/([0-9a-fA-F]+)/)
  return m ? m[1] : href
}

function absolutize(href: string): string {
  if (!href) return ''
  if (href.startsWith('http')) return href
  return `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`
}

// Take the first leading [Group] prefix; if it's an "&"/"／" joined list, keep only the first.
function parseLeadingGroup(title: string): string {
  const m = title.match(/^\s*[[【]([^\]】]+)[\]】]/)
  if (!m) return ''
  return m[1].split(/[&／/]/)[0].trim()
}

export async function searchMikanResources(keyword: string, page = 1): Promise<SearchResult> {
  const kw = keyword.trim()
  if (!kw) return classicList(page)

  const url = `${BASE_URL}/Home/Search?searchstr=${encodeURIComponent(kw)}`
  const html = await throttledGet(url)
  const $ = cheerio.load(html)

  const all: Resource[] = []
  $('tr.js-search-results-row').each((_, row) => {
    const $row = $(row)
    const $tds = $row.find('> td')
    if ($tds.length < 5) return

    const $titleLink = $tds.eq(1).find('a.magnet-link-wrap').first()
    const title = $titleLink.text().trim()
    const detailHref = $titleLink.attr('href') || ''
    if (!title || !detailHref) return

    const magnetUrl =
      $tds.eq(0).find('input.js-episode-select').attr('data-magnet') ||
      $tds.eq(1).find('a.js-magnet').attr('data-clipboard-text') ||
      ''
    const size = $tds.eq(2).text().trim()
    const publishTime = $tds.eq(3).text().trim()
    const torrentHref = $tds.eq(4).find('a[href$=".torrent"]').attr('href') || ''
    const id = extractHash(detailHref)
    const publisher = parseLeadingGroup(title)

    all.push({
      id,
      title,
      detailUrl: absolutize(detailHref),
      publishTime,
      publisher,
      publisherUrl: '',
      teamId: publisher,
      category: '',
      size,
      magnetUrl,
      torrentUrl: absolutize(torrentHref)
    })
  })

  const start = (page - 1) * PAGE_SIZE
  const slice = all.slice(start, start + PAGE_SIZE)
  return { resources: slice, page, hasMore: all.length > start + PAGE_SIZE }
}

async function classicList(page: number): Promise<SearchResult> {
  const url = `${BASE_URL}/Home/Classic/${page}`
  const html = await throttledGet(url)
  const $ = cheerio.load(html)

  const resources: Resource[] = []
  $('table.table.table-striped tbody > tr').each((_, row) => {
    const $row = $(row)
    const $tds = $row.find('> td')
    if ($tds.length < 5) return

    const publishTime = $tds.eq(0).text().trim().replace(/\s+/g, ' ')
    const publisher = $tds.eq(1).text().trim().replace(/\s+/g, ' ')
    const $titleTd = $tds.eq(2)
    const $titleLink = $titleTd.find('a.magnet-link-wrap').first()
    const title = $titleLink.text().trim()
    const detailHref = $titleLink.attr('href') || ''
    if (!title || !detailHref) return
    const magnetUrl = $titleTd.find('a.js-magnet').attr('data-clipboard-text') || ''
    const size = $tds.eq(3).text().trim()
    const torrentHref = $tds.eq(4).find('a[href$=".torrent"]').attr('href') || ''
    const id = extractHash(detailHref)

    resources.push({
      id,
      title,
      detailUrl: absolutize(detailHref),
      publishTime,
      publisher,
      publisherUrl: '',
      teamId: publisher,
      category: '',
      size,
      magnetUrl,
      torrentUrl: absolutize(torrentHref)
    })
  })

  const hasMore = resources.length > 0
  return { resources, page, hasMore }
}

export async function getMikanDetail(detailUrl: string): Promise<string> {
  const html = await throttledGet(detailUrl)
  const $ = cheerio.load(html)
  return $('a.episode-btn[href^="magnet:"]').first().attr('href') || ''
}

// Mikan episode pages do not expose a structured file list.
export async function getMikanFiles(detailUrl: string): Promise<string[]> {
  void detailUrl
  return []
}

export interface Bangumi {
  id: string
  name: string
  poster: string
  lastUpdate: string
  dayOfWeek: string
}

export interface BangumiSection {
  dayOfWeek: string
  label: string
  bangumis: Bangumi[]
}

function absolutizePoster(src: string): string {
  if (!src) return ''
  if (src.startsWith('http')) return src
  // Mikan poster paths look like "/images/Bangumi/202604/a7b244da.jpg?width=400&height=400&format=webp"
  return `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`
}

export async function getMikanSchedule(): Promise<BangumiSection[]> {
  const html = await throttledGet(`${BASE_URL}/`)
  const $ = cheerio.load(html)

  const sections: BangumiSection[] = []
  $('div.sk-bangumi[data-dayofweek]').each((_, el) => {
    const $section = $(el)
    const dayOfWeek = $section.attr('data-dayofweek') || ''
    const label = $section.find('div.row').first().text().trim() || dayOfWeek
    const bangumis: Bangumi[] = []
    $section.find('ul.an-ul > li').each((__, li) => {
      const $li = $(li)
      const $poster = $li.find('span.js-expand_bangumi').first()
      const id = $poster.attr('data-bangumiid') || ''
      const poster = absolutizePoster($poster.attr('data-src') || '')
      const $link = $li.find('a.an-text').first()
      const name = ($link.attr('title') || $link.text() || '').trim()
      const lastUpdate = $li.find('div.date-text').first().text().trim()
      if (!id || !name) return
      bangumis.push({ id, name, poster, lastUpdate, dayOfWeek })
    })
    if (bangumis.length > 0) {
      sections.push({ dayOfWeek, label, bangumis })
    }
  })

  return sections
}

export async function getMikanBangumi(
  bangumiId: string
): Promise<{ name: string; resources: Resource[] }> {
  const url = `${BASE_URL}/Home/Bangumi/${encodeURIComponent(bangumiId)}`
  const html = await throttledGet(url)
  const $ = cheerio.load(html)
  const name = $('p.bangumi-title').first().clone().find('a').remove().end().text().trim()

  const resources: Resource[] = []
  $('table.table.table-striped tbody > tr').each((_, row) => {
    const $row = $(row)
    const $tds = $row.find('> td')
    if ($tds.length < 5) return

    const $titleLink = $tds.eq(1).find('a.magnet-link-wrap').first()
    const title = $titleLink.text().trim()
    const detailHref = $titleLink.attr('href') || ''
    if (!title || !detailHref) return

    const magnetUrl =
      $tds.eq(0).find('input.js-episode-select').attr('data-magnet') ||
      $tds.eq(1).find('a.js-magnet').attr('data-clipboard-text') ||
      ''
    const size = $tds.eq(2).text().trim()
    const publishTime = $tds.eq(3).text().trim()
    const torrentHref = $tds.eq(4).find('a[href$=".torrent"]').attr('href') || ''
    const id = extractHash(detailHref)
    const publisher = parseLeadingGroup(title)

    resources.push({
      id,
      title,
      detailUrl: absolutize(detailHref),
      publishTime,
      publisher,
      publisherUrl: '',
      teamId: publisher,
      category: '',
      size,
      magnetUrl,
      torrentUrl: absolutize(torrentHref)
    })
  })

  return { name, resources }
}
