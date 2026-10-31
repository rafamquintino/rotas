import { createRoot } from 'react-dom/client'
import '@fontsource/big-shoulders-display/latin-700'
import '@fontsource/big-shoulders-display/latin-800'
import '@fontsource/big-shoulders-display/latin-900'
import '@fontsource/big-shoulders-stencil-display/latin-900'
import '@fontsource/newsreader/latin-400'
import '@fontsource/newsreader/latin-400-italic'
import '@fontsource/newsreader/latin-500'
import './styles.css'
import App from './App'

document.documentElement.classList.add('is-loading')
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

// garante as fontes antes de desenhar rótulos em canvas
const fonts = [
  '900 64px "Big Shoulders Stencil Display"',
  '800 64px "Big Shoulders Display"',
  '700 64px "Big Shoulders Display"',
  'italic 400 32px "Newsreader"',
]
Promise.race([
  Promise.all(fonts.map((f) => document.fonts.load(f))),
  new Promise((r) => setTimeout(r, 2500)),
]).finally(() => createRoot(document.getElementById('root')).render(<App />))
