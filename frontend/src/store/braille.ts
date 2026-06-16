import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { BRAILLE_MAP, textToBraille, brailleToText, dotsToUnicode } from '../utils/braille'
import type { LearnMode, WrongAnswer, LetterGroup } from '../types'

const STORAGE_KEY = 'braille_wrong_answers'

function loadWrongAnswers(): WrongAnswer[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export const useBrailleStore = defineStore('braille', () => {
  const inputText = ref('')
  const brailleOutput = ref<number[][]>([])
  const learnMode = ref<LearnMode>('charToBraille')
  const quizChar = ref('')
  const selectedDots = ref<number[]>([])
  const score = ref({ correct: 0, total: 0 })
  const history = ref<{ input: string; correct: boolean }[]>([])
  const wrongAnswers = ref<WrongAnswer[]>(loadWrongAnswers())
  const selectedLetterGroup = ref<LetterGroup>('all')
  const reviewMode = ref(false)
  const reviewIndex = ref(0)
  const reviewList = ref<string[]>([])

  const brailleUnicode = computed(() =>
    brailleOutput.value.map(d => dotsToUnicode(d)).join('')
  )

  const LETTER_GROUP_RANGES: Record<Exclude<LetterGroup, 'all'>, [string, string]> = {
    'A-E': ['A', 'E'],
    'F-J': ['F', 'J'],
    'K-O': ['K', 'O'],
    'P-T': ['P', 'T'],
    'U-Z': ['U', 'Z'],
  }

  const filteredWrongAnswers = computed(() => {
    if (selectedLetterGroup.value === 'all') return wrongAnswers.value
    const [start, end] = LETTER_GROUP_RANGES[selectedLetterGroup.value]
    return wrongAnswers.value.filter(w => w.char >= start && w.char <= end)
  })

  const uniqueWrongChars = computed(() => {
    const seen = new Set<string>()
    return filteredWrongAnswers.value.filter(w => {
      if (seen.has(w.char)) return false
      seen.add(w.char)
      return true
    }).map(w => w.char)
  })

  watch(wrongAnswers, (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch {}
  }, { deep: true })

  function translate() {
    brailleOutput.value = textToBraille(inputText.value)
  }

  function reverseTranslate() {
    // Simple: take selectedDots and find matching char
    return brailleToText(selectedDots.value)
  }

  function generateQuiz() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    quizChar.value = chars[Math.floor(Math.random() * chars.length)]
    selectedDots.value = []
  }

  function toggleDot(dot: number) {
    const idx = selectedDots.value.indexOf(dot)
    if (idx >= 0) selectedDots.value.splice(idx, 1)
    else selectedDots.value.push(dot)
  }

  function checkQuizAnswer() {
    const correct = JSON.stringify([...selectedDots.value].sort()) === JSON.stringify([...(BRAILLE_MAP[quizChar.value] || [])].sort())
    score.value.total++
    if (correct) score.value.correct++
    else {
      wrongAnswers.value.unshift({
        char: quizChar.value,
        wrongDots: [...selectedDots.value],
        correctDots: [...(BRAILLE_MAP[quizChar.value] || [])],
        timestamp: Date.now(),
        reviewCount: 0,
      })
    }
    history.value.unshift({ input: quizChar.value, correct })
    if (navigator.vibrate) navigator.vibrate(correct ? 100 : [100, 50, 100])
    generateQuiz()
  }

  function removeWrongAnswer(index: number) {
    const realIndex = wrongAnswers.value.findIndex(
      w => w.timestamp === filteredWrongAnswers.value[index]?.timestamp
    )
    if (realIndex >= 0) wrongAnswers.value.splice(realIndex, 1)
  }

  function removeWrongChar(char: string) {
    wrongAnswers.value = wrongAnswers.value.filter(w => w.char !== char)
  }

  function clearWrongAnswers() {
    wrongAnswers.value = []
  }

  function startReview() {
    if (uniqueWrongChars.value.length === 0) return
    reviewList.value = [...uniqueWrongChars.value].sort(() => Math.random() - 0.5)
    reviewIndex.value = 0
    reviewMode.value = true
    quizChar.value = reviewList.value[0]
    selectedDots.value = []
  }

  function checkReviewAnswer(): boolean {
    const correct = JSON.stringify([...selectedDots.value].sort()) === JSON.stringify([...(BRAILLE_MAP[quizChar.value] || [])].sort())
    if (correct) {
      const target = wrongAnswers.value.find(w => w.char === quizChar.value)
      if (target) {
        target.reviewCount++
        target.lastReviewed = Date.now()
      }
    }
    if (navigator.vibrate) navigator.vibrate(correct ? 100 : [100, 50, 100])
    return correct
  }

  function nextReviewQuestion() {
    if (reviewIndex.value < reviewList.value.length - 1) {
      reviewIndex.value++
      quizChar.value = reviewList.value[reviewIndex.value]
      selectedDots.value = []
      return true
    }
    return false
  }

  function exitReview() {
    reviewMode.value = false
    reviewList.value = []
    reviewIndex.value = 0
    quizChar.value = ''
    selectedDots.value = []
  }

  function resetScore() {
    score.value = { correct: 0, total: 0 }
    history.value = []
  }

  function exportPDF(): string {
    const lines = inputText.value.toUpperCase().split('')
    let out = '盲文翻译输出\n\n'
    for (const ch of lines) {
      const dots = BRAILLE_MAP[ch] || []
      out += `${ch} → [${dots.join(',')}] ${dotsToUnicode(dots)}\n`
    }
    return out
  }

  return {
    inputText, brailleOutput, learnMode, quizChar, selectedDots, score, history,
    wrongAnswers, selectedLetterGroup, reviewMode, reviewIndex, reviewList,
    filteredWrongAnswers, uniqueWrongChars,
    brailleUnicode, translate, reverseTranslate, generateQuiz, toggleDot,
    checkQuizAnswer, resetScore, exportPDF,
    removeWrongAnswer, removeWrongChar, clearWrongAnswers,
    startReview, checkReviewAnswer, nextReviewQuestion, exitReview
  }
})
