// Generates PWA icons + iOS splash screens from an on-brand SVG mark.
// Run with: pnpm icons
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const AMBER = '#E8943A'
const PARCHMENT = '#FDF8F2'

// A speech bubble (coach) holding two note lines (notebook) on amber.
function iconSvg({ bg = AMBER, padding = false } = {}) {
  const inset = padding ? 120 : 0 // maskable safe-zone padding
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${bg}"/>
  <g transform="translate(${inset},${inset}) scale(${(1024 - inset * 2) / 1024})">
    <path d="M280 300
             h408 a56 56 0 0 1 56 56
             v188 a56 56 0 0 1 -56 56
             H470 l-90 86 v-86 H280
             a56 56 0 0 1 -56 -56
             V356 a56 56 0 0 1 56 -56 z"
          fill="#FDF8F2"/>
    <rect x="320" y="372" width="384" height="44" rx="22" fill="${AMBER}"/>
    <rect x="320" y="452" width="270" height="44" rx="22" fill="${AMBER}"/>
  </g>
</svg>`
}

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
}

async function ensureDir(p) {
  await mkdir(dirname(p), { recursive: true })
}

async function main() {
  const standard = iconSvg()
  const maskable = iconSvg({ padding: true })

  const targets = [
    ['public/icons/icon-192.png', standard, 192],
    ['public/icons/icon-512.png', standard, 512],
    ['public/icons/icon-512-maskable.png', maskable, 512],
    ['public/icons/apple-touch-icon.png', iconSvg({ bg: AMBER }), 180],
  ]

  for (const [rel, svg, size] of targets) {
    const out = resolve(root, rel)
    await ensureDir(out)
    await writeFile(out, await png(svg, size))
    console.log('wrote', rel)
  }

  // Favicon (32) as PNG into public.
  await writeFile(
    resolve(root, 'public/favicon.ico'),
    await png(standard, 48),
  )
  console.log('wrote public/favicon.ico')

  // iOS splash screens: centered mark on parchment.
  const splashes = [
    [1290, 2796],
    [1179, 2556],
    [1284, 2778],
    [750, 1334],
  ]
  const mark = await png(standard, 360)
  for (const [w, h] of splashes) {
    const out = resolve(root, `public/splash/splash-${w}x${h}.png`)
    await ensureDir(out)
    const base = sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: PARCHMENT,
      },
    })
    const buf = await base
      .composite([{ input: mark, gravity: 'center' }])
      .png()
      .toBuffer()
    await writeFile(out, buf)
    console.log('wrote', `public/splash/splash-${w}x${h}.png`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
