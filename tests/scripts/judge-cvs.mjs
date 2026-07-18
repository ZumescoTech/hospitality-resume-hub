/**
 * judge-cvs.mjs — LLM judge for CV journey artifacts
 *
 * Usage: node tests/scripts/judge-cvs.mjs
 *
 * Reads PDFs from test-results/cv-journey/<id>/{baseline.pdf, assisted.pdf}
 * Extracts text with pdfjs-dist, calls Groq (temperature 0) with the judge
 * prompt from docs/cv-judging-protocol.md, runs 3×, takes median scores,
 * and writes test-results/cv-journey/<id>/judge-result.json.
 *
 * Requires GROQ_API_KEY in .env.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../')

// ── Load env ─────────────────────────────────────────────────────────────────
const envPath = path.join(ROOT, '.env')
const env = {}
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?(.+?)"?\s*$/)
    if (m) env[m[1]] = m[2]
  }
}
const GROQ_KEY = env['GROQ_API_KEY'] || process.env.GROQ_API_KEY
if (!GROQ_KEY) {
  console.error('ERROR: GROQ_API_KEY not found in .env — cannot call Groq')
  process.exit(1)
}

// ── PDF text extraction ───────────────────────────────────────────────────────
async function extractPdfText(pdfPath) {
  // Use pdfjs-dist legacy build for Node
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs').catch(async () => {
    return await import('pdfjs-dist')
  })
  GlobalWorkerOptions.workerSrc = ''

  const data = new Uint8Array(fs.readFileSync(pdfPath))
  const loadingTask = getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true })
  const pdf = await loadingTask.promise
  const texts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    texts.push(content.items.map(item => ('str' in item ? item.str : '')).join(' '))
  }
  return texts.join('\n').replace(/\s{3,}/g, '\n').trim()
}

// ── Groq judge call ───────────────────────────────────────────────────────────
const JUDGE_SYSTEM = `You are a strict, evidence-based CV evaluation judge for a hospitality and cruise-ship
resume tool. You compare an ORIGINAL CV against a GENERATED CV and score specific
dimensions. You must ground every score in quoted before/after evidence. You never
reward invented facts. If you cannot verify something from the text provided, score it
conservatively and say so. Output JSON only, no prose, no markdown fences.

Scoring is 1 to 5 where 5 is excellent and 1 is broken. Return this exact shape:

{
  "comparison": {
    "information_retained": { "score": 1, "evidence": "what if anything was lost" },
    "wording_improved":     { "score": 1, "evidence": "before -> after quote" },
    "no_hallucination":     { "score": 1, "evidence": "anything not in the original, or 'none found'" },
    "stronger_overall":     { "score": 1, "evidence": "why" },
    "recruiter_preference": { "score": 1, "evidence": "which version a hospitality recruiter prefers and why" }
  },
  "ai_quality": {
    "grammar":           { "score": 1, "evidence": "" },
    "professional_tone": { "score": 1, "evidence": "" },
    "stronger_bullets":  { "score": 1, "evidence": "before -> after quote" },
    "better_summary":    { "score": 1, "evidence": "before -> after quote" }
  },
  "ats_text": {
    "keywords":         { "score": 1, "evidence": "role keywords present or missing" },
    "structure":        { "score": 1, "evidence": "" },
    "section_ordering": { "score": 1, "evidence": "" },
    "readability":      { "score": 1, "evidence": "" }
  },
  "flags": ["any concern, especially suspected fabrication, that a human must review"]
}

Rules:
- Judge only the text given. Do not assume facts not present.
- "Stronger" never means "more embellished". Inflated or unverifiable claims lower the score, they do not raise it.
- For no_hallucination, a 5 means every claim in the generated CV traces to the original. Any fabricated employer, date, credential, or number is a 1 and must appear in flags.
- Quote real substrings as evidence. Do not paraphrase the evidence.`

async function callGroqJudge(role, sourceText, generatedText, includeAiQuality = false) {
  const userMsg = `ROLE: ${role}

ORIGINAL:
${sourceText.slice(0, 4000)}

GENERATED${includeAiQuality ? ' (assisted)' : ' (baseline)'}:
${generatedText.slice(0, 4000)}

Score this CV. ${!includeAiQuality ? 'Skip ai_quality fields — this is a baseline (no tailoring) pass. Fill comparison and ats_text only.' : ''}`

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM },
        { role: 'user', content: userMsg },
      ],
    }),
  })
  if (!resp.ok) throw new Error(`Groq error ${resp.status}: ${await resp.text()}`)
  const data = await resp.json()
  const raw = data.choices[0].message.content
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in judge response: ' + raw.slice(0, 200))
  return JSON.parse(match[0])
}

// ── Median of scores ──────────────────────────────────────────────────────────
function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function medianResult(results) {
  // Deep-merge: for each numeric score, take median across 3 runs
  const merged = JSON.parse(JSON.stringify(results[0]))
  function mergeScores(obj, key) {
    if (!obj) return
    for (const k of Object.keys(obj)) {
      if (k === 'score') {
        obj[k] = median(results.map(r => {
          try {
            // Navigate same path in each result
            return key.reduce((o, p) => o?.[p], r)?.score ?? obj[k]
          } catch { return obj[k] }
        }))
      } else if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        mergeScores(obj[k], [...key, k])
      }
    }
  }
  mergeScores(merged, [])
  return merged
}

// ── Hallucination deterministic check ────────────────────────────────────────
function deterministicHallucinationCheck(sourceText, assistedText) {
  // Extract numbers and proper nouns from assisted that aren't in source
  // Simple heuristic: look for digits that appear in assisted but not in a 10-char window in source
  const assistedNumbers = assistedText.match(/\b\d[\d,]+\b/g) || []
  const suspicious = assistedNumbers.filter(n => !sourceText.includes(n))
  return { suspiciousNumbers: suspicious, clean: suspicious.length === 0 }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const journeyDir = path.join(ROOT, 'cv-journey-artifacts')
  if (!fs.existsSync(journeyDir)) {
    console.error('No journey artifacts found. Run the cv-journey Playwright tests first.')
    process.exit(1)
  }

  const cvDirs = fs.readdirSync(journeyDir).filter(d =>
    fs.statSync(path.join(journeyDir, d)).isDirectory()
  )

  console.log(`Found ${cvDirs.length} CV artifact directories: ${cvDirs.join(', ')}\n`)

  const allResults = []

  for (const cvId of cvDirs) {
    const dir = path.join(journeyDir, cvId)
    const baselinePdf = path.join(dir, 'baseline.pdf')
    const assistedPdf = path.join(dir, 'assisted.pdf')
    const sourcePdf = Object.values({
      'innocent-chilongo': 'cv-tests/sommelier/Innocent__Chilongo_-_Sommelier.pdf',
      'michelle-gaswa':    'cv-tests/sommelier/Michelle_Rumbidzai__Gaswa_-_Sommelier.pdf',
      'sommelier-a':       'cv-tests/sommelier/SOMMELIER.pdf',
      'sommelier-winewaiter': 'cv-tests/sommelier/SOMMELIER-WINEWAITER.pdf',
      'winesteward':       'cv-tests/sommelier/WINESTEWARD.pdf',
      'amanda-phiri':      'cv-tests/waitress/Amanda_Phiri_CV.pdf',
    }).find ? {
      'innocent-chilongo': 'cv-tests/sommelier/Innocent__Chilongo_-_Sommelier.pdf',
      'michelle-gaswa':    'cv-tests/sommelier/Michelle_Rumbidzai__Gaswa_-_Sommelier.pdf',
      'sommelier-a':       'cv-tests/sommelier/SOMMELIER.pdf',
      'sommelier-winewaiter': 'cv-tests/sommelier/SOMMELIER-WINEWAITER.pdf',
      'winesteward':       'cv-tests/sommelier/WINESTEWARD.pdf',
      'amanda-phiri':      'cv-tests/waitress/Amanda_Phiri_CV.pdf',
    }[cvId] : null

    const role = cvId === 'amanda-phiri' ? 'waiter-waitress' : 'sommelier-wine-waiter'

    console.log(`\n── ${cvId} ──`)

    if (!sourcePdf) { console.log('  SKIP: unknown CV id'); continue }
    const sourceAbs = path.join(ROOT, sourcePdf)
    if (!fs.existsSync(sourceAbs)) { console.log('  SKIP: source PDF missing'); continue }
    if (!fs.existsSync(baselinePdf)) { console.log('  SKIP: baseline.pdf missing — run cv-journey tests first'); continue }

    let sourceText, baselineText, assistedText
    try {
      console.log('  Extracting source PDF text...')
      sourceText = await extractPdfText(sourceAbs)
      console.log(`  Source: ${sourceText.length} chars`)
      console.log('  Extracting baseline PDF text...')
      baselineText = await extractPdfText(baselinePdf)
      console.log(`  Baseline: ${baselineText.length} chars`)
    } catch (e) {
      console.error(`  ERROR extracting PDF text: ${e.message}`)
      continue
    }

    // Baseline judge (3 runs, median)
    console.log('  Running baseline judge (3×)...')
    const baselineRuns = []
    for (let i = 0; i < 3; i++) {
      try {
        const r = await callGroqJudge(role, sourceText, baselineText, false)
        baselineRuns.push(r)
        console.log(`    run ${i+1}: comparison.information_retained=${r.comparison?.information_retained?.score}`)
      } catch (e) {
        console.error(`    run ${i+1} FAILED: ${e.message}`)
      }
    }
    const baselineMedian = baselineRuns.length > 0 ? medianResult(baselineRuns) : null

    // Assisted judge
    let assistedMedian = null
    let hallucinationCheck = null
    if (fs.existsSync(assistedPdf)) {
      try {
        console.log('  Extracting assisted PDF text...')
        assistedText = await extractPdfText(assistedPdf)
        console.log(`  Assisted: ${assistedText.length} chars`)

        // Deterministic hallucination check
        hallucinationCheck = deterministicHallucinationCheck(sourceText, assistedText)
        console.log(`  Hallucination check: ${hallucinationCheck.clean ? 'CLEAN' : 'SUSPICIOUS: ' + hallucinationCheck.suspiciousNumbers.join(', ')}`)

        console.log('  Running assisted judge (3×)...')
        const assistedRuns = []
        for (let i = 0; i < 3; i++) {
          try {
            const r = await callGroqJudge(role, sourceText, assistedText, true)
            assistedRuns.push(r)
            console.log(`    run ${i+1}: no_hallucination=${r.comparison?.no_hallucination?.score}`)
          } catch (e) {
            console.error(`    run ${i+1} FAILED: ${e.message}`)
          }
        }
        assistedMedian = assistedRuns.length > 0 ? medianResult(assistedRuns) : null
      } catch (e) {
        console.error(`  Assisted judge ERROR: ${e.message}`)
      }
    } else {
      console.log('  assisted.pdf missing — skipping assisted judge')
    }

    const result = { cvId, role, sourceChars: sourceText?.length, baselineChars: baselineText?.length, assistedChars: assistedText?.length, baselineMedian, assistedMedian, hallucinationCheck }
    fs.writeFileSync(path.join(dir, 'judge-result.json'), JSON.stringify(result, null, 2))
    allResults.push(result)
    console.log(`  Saved judge-result.json`)
  }

  // Write summary
  fs.writeFileSync(path.join(journeyDir, 'judge-summary.json'), JSON.stringify(allResults, null, 2))
  console.log(`\nDone. Results in test-results/cv-journey/judge-summary.json`)
}

main().catch(e => { console.error(e); process.exit(1) })
