#!/usr/bin/env node
// Prepara os vídeos brutos de footage/ para o site (public/film/).
// Uso: npm run film
//
// Nomeie cada arquivo com a chave da cena (veja src/film/scenes.js):
//   footage/hero.mp4, footage/mergulho.mov, footage/lager.mp4 ...
// Cortes opcionais em footage/cortes.json:
//   { "hero": { "inicio": 2.5, "duracao": 6 } }
//
// Gera para cada cena: versão desktop (horizontal) e celular (vertical, recorte central),
// sem áudio, com faststart; cenas "scrub" são codificadas só com keyframes para o scroll ser liso.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join, parse } from 'node:path'
import { SCENES } from '../src/film/scenes.js'

const root = new URL('..', import.meta.url).pathname
const IN = join(root, 'footage')
const OUT = join(root, 'public', 'film')
const cuts = existsSync(join(IN, 'cortes.json')) ? JSON.parse(readFileSync(join(IN, 'cortes.json'), 'utf8')) : {}

if (!existsSync(IN)) {
  console.error('Crie a pasta footage/ com os vídeos.')
  process.exit(1)
}
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const files = readdirSync(IN).filter((f) => /\.(mp4|mov|m4v|webm|mkv)$/i.test(f))
const byKey = Object.fromEntries(files.map((f) => [parse(f).name.toLowerCase(), f]))

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
const probe = (file) =>
  parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString())

const manifest = { geradoEm: new Date().toISOString(), scenes: {} }

for (const scene of SCENES) {
  const f = byKey[scene.key]
  if (!f) {
    console.log(`  –  ${scene.key.padEnd(12)} (sem vídeo${scene.fallback ? `, vai usar ${scene.fallback}` : ''})`)
    continue
  }
  const src = join(IN, f)
  const cut = cuts[scene.key] || {}
  const trim = [...(cut.inicio ? ['-ss', String(cut.inicio)] : []), ...(cut.duracao ? ['-t', String(cut.duracao)] : [])]
  const scrub = scene.mode === 'scrub'
  // scrub: menor e só keyframes (-g 1) para o seek ser instantâneo
  const enc = scrub
    ? ['-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-g', '1', '-keyint_min', '1', '-sc_threshold', '0']
    : ['-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-g', '48']
  const common = ['-an', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', scrub ? '30' : '24']
  const wD = scrub ? 1280 : 1600
  const hM = scrub ? 1136 : 1280

  const desktop = `${scene.key}.mp4`
  const mobile = `${scene.key}-m.mp4`
  ff([...trim, '-i', src, '-vf', `scale=${wD}:-2:flags=lanczos`, ...enc, ...common, join(OUT, desktop)])
  ff([...trim, '-i', src, '-vf', `crop='min(iw,ih*9/16)':ih,scale=-2:${hM}:flags=lanczos`, ...enc, ...common, join(OUT, mobile)])
  ff(['-i', join(OUT, desktop), '-frames:v', '1', '-q:v', '70', join(OUT, `${scene.key}.webp`)])
  ff(['-i', join(OUT, mobile), '-frames:v', '1', '-q:v', '70', join(OUT, `${scene.key}-m.webp`)])

  const duration = probe(join(OUT, desktop))
  manifest.scenes[scene.key] = {
    desktop,
    mobile,
    poster: `${scene.key}.webp`,
    posterMobile: `${scene.key}-m.webp`,
    duration: Math.round(duration * 100) / 100,
  }
  const kb = (n) => Math.round(readFileSync(join(OUT, n)).length / 1024)
  console.log(`  ✓  ${scene.key.padEnd(12)} ${duration.toFixed(1)}s  desktop ${kb(desktop)} KB, celular ${kb(mobile)} KB`)
}

if (!manifest.scenes.hero) console.warn('\n⚠️  Sem footage/hero.*: o site continua usando o 3D até existir um vídeo do herói.')
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\nManifesto salvo em public/film/manifest.json. Rode "npm run build" para gerar o site.`)
