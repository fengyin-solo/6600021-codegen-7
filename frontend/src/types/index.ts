export interface BrailleChar {
  char: string
  dots: number[]  // 1-6 active dots
  unicode: string
}

export type LearnMode = 'charToBraille' | 'brailleToChar' | 'dictation'

export interface WrongAnswer {
  char: string
  wrongDots: number[]
  correctDots: number[]
  timestamp: number
  reviewCount: number
  lastReviewed?: number
}

export type LetterGroup = 'all' | 'A-E' | 'F-J' | 'K-O' | 'P-T' | 'U-Z'
