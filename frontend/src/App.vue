<template>
  <div class="min-h-screen p-4 flex flex-col gap-4 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-purple-400">盲文翻译与触觉学习器</h1>

    <div class="flex gap-2">
      <button v-for="t in tabs" :key="t.id" @click="activeTab = t.id"
        class="px-4 py-2 rounded text-sm"
        :class="activeTab === t.id ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'">
        {{ t.label }}
      </button>
    </div>

    <!-- Translate -->
    <div v-if="activeTab === 'translate'" class="grid grid-cols-2 gap-4">
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-2">文本输入</h3>
        <textarea v-model="store.inputText" @input="store.translate()"
          class="w-full h-32 bg-gray-800 rounded p-3 text-white resize-none" placeholder="输入英文文本..." />
      </div>
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-2">盲文输出</h3>
        <div class="text-4xl tracking-wider text-purple-300 h-16">{{ store.brailleUnicode }}</div>
        <div class="flex flex-wrap gap-2 mt-3">
          <BrailleCell v-for="(dots, i) in store.brailleOutput" :key="i" :dots="dots" :size="40" />
        </div>
      </div>
    </div>

    <!-- Learn -->
    <div v-if="activeTab === 'learn'" class="grid grid-cols-2 gap-4">
      <div class="bg-gray-900 rounded-xl p-4 flex flex-col items-center gap-4">
        <h3 class="text-purple-300 font-bold">猜盲文</h3>
        <div v-if="!store.quizChar">
          <button @click="store.generateQuiz()" class="bg-purple-500 px-6 py-3 rounded-lg text-lg hover:bg-purple-400">
            开始训练
          </button>
        </div>
        <div v-else class="flex flex-col items-center gap-3">
          <div class="text-7xl font-bold text-purple-400">{{ store.quizChar }}</div>
          <div class="text-sm text-gray-400">点击下方 6 点阵选择对应盲文</div>
          <div class="grid grid-cols-2 gap-2 p-4 bg-gray-800 rounded-xl">
            <button v-for="d in 6" :key="d" @click="store.toggleDot(d)"
              class="w-14 h-14 rounded-full border-2 transition-all"
              :class="store.selectedDots.includes(d) ? 'bg-purple-500 border-purple-400 scale-110' : 'bg-gray-700 border-gray-600 hover:border-purple-400'">
              <span class="text-xs">{{ d }}</span>
            </button>
          </div>
          <button @click="store.checkQuizAnswer()" class="bg-purple-500 px-6 py-2 rounded hover:bg-purple-400">确认</button>
        </div>
      </div>
      <div class="bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between mb-2">
          <h3 class="text-purple-300 font-bold">统计</h3>
          <button @click="store.resetScore()" class="text-red-400 text-xs hover:underline">重置</button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center mb-3">
          <div class="bg-gray-800 rounded p-2">
            <div class="text-2xl font-bold text-green-400">{{ store.score.correct }}</div>
            <div class="text-xs text-gray-400">正确</div>
          </div>
          <div class="bg-gray-800 rounded p-2">
            <div class="text-2xl font-bold text-red-400">{{ store.score.total - store.score.correct }}</div>
            <div class="text-xs text-gray-400">错误</div>
          </div>
          <div class="bg-gray-800 rounded p-2">
            <div class="text-2xl font-bold text-purple-400">{{ store.score.total ? Math.round(store.score.correct / store.score.total * 100) : 0 }}%</div>
            <div class="text-xs text-gray-400">正确率</div>
          </div>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div v-for="(h, i) in store.history.slice(0, 20)" :key="i"
            class="flex justify-between bg-gray-800 rounded p-2 text-sm"
            :class="h.correct ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'">
            <span>{{ h.input }}</span><span>{{ h.correct ? '✓' : '✗' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Wrong Answer Book -->
    <div v-if="activeTab === 'wrongbook'" class="bg-gray-900 rounded-xl p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-purple-300 font-bold text-xl">📕 错题本</h3>
        <div class="flex gap-2">
          <button v-if="!store.reviewMode && store.uniqueWrongChars.length > 0"
            @click="store.startReview()"
            class="bg-purple-600 px-4 py-2 rounded text-sm hover:bg-purple-500">
            开始集中复习 ({{ store.uniqueWrongChars.length }}题)
          </button>
          <button v-if="store.reviewMode"
            @click="store.exitReview(); reviewFeedback.show = false"
            class="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500">
            退出复习
          </button>
          <button v-if="!store.reviewMode && store.wrongAnswers.length > 0"
            @click="store.clearWrongAnswers()"
            class="bg-red-700 px-4 py-2 rounded text-sm hover:bg-red-600">
            清空错题本
          </button>
        </div>
      </div>

      <!-- Review Mode -->
      <div v-if="store.reviewMode" class="grid grid-cols-2 gap-4">
        <div class="bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-4">
          <div class="text-sm text-gray-400">
            复习进度: {{ store.reviewIndex + 1 }} / {{ store.reviewList.length }}
          </div>
          <div class="text-7xl font-bold text-purple-400">{{ store.quizChar }}</div>
          <div class="text-sm text-gray-400">请选择对应的盲文点位</div>
          <div class="grid grid-cols-2 gap-2 p-4 bg-gray-900 rounded-xl">
            <button v-for="d in 6" :key="d" @click="store.toggleDot(d)"
              class="w-14 h-14 rounded-full border-2 transition-all"
              :class="store.selectedDots.includes(d) ? 'bg-purple-500 border-purple-400 scale-110' : 'bg-gray-700 border-gray-600 hover:border-purple-400'">
              <span class="text-xs">{{ d }}</span>
            </button>
          </div>
          <div class="flex gap-2">
            <button v-if="!reviewFeedback.show"
              @click="reviewFeedback = { show: true, correct: store.checkReviewAnswer() }"
              class="bg-purple-500 px-6 py-2 rounded hover:bg-purple-400">确认答案</button>
            <template v-else>
              <div class="px-4 py-2 rounded text-lg font-bold"
                :class="reviewFeedback.correct ? 'bg-green-600' : 'bg-red-600'">
                {{ reviewFeedback.correct ? '✓ 正确！' : '✗ 错误' }}
              </div>
              <button v-if="store.reviewIndex < store.reviewList.length - 1"
                @click="store.nextReviewQuestion(); reviewFeedback.show = false"
                class="bg-purple-500 px-6 py-2 rounded hover:bg-purple-400">下一题</button>
              <button v-else
                @click="store.exitReview(); reviewFeedback.show = false"
                class="bg-green-600 px-6 py-2 rounded hover:bg-green-500">完成复习</button>
            </template>
          </div>
          <div v-if="reviewFeedback.show && !reviewFeedback.correct" class="flex gap-6 items-center">
            <div class="flex flex-col items-center">
              <div class="text-xs text-gray-400 mb-1">你的答案</div>
              <BrailleCell :dots="store.selectedDots" :size="40" />
            </div>
            <div class="text-gray-500">→</div>
            <div class="flex flex-col items-center">
              <div class="text-xs text-green-400 mb-1">正确答案</div>
              <BrailleCell :dots="BRAILLE_MAP[store.quizChar] || []" :size="40" />
            </div>
          </div>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <h4 class="text-purple-300 font-bold mb-2">本轮复习列表</h4>
          <div class="flex flex-wrap gap-2">
            <span v-for="(c, i) in store.reviewList" :key="i"
              class="px-3 py-1 rounded text-sm"
              :class="i < store.reviewIndex ? 'bg-green-700' : i === store.reviewIndex ? 'bg-purple-600 ring-2 ring-purple-400' : 'bg-gray-700'">
              {{ c }}
            </span>
          </div>
        </div>
      </div>

      <!-- Wrong Answer List -->
      <div v-else>
        <!-- Letter Group Filter -->
        <div class="flex gap-2 mb-4 flex-wrap">
          <button v-for="g in letterGroups" :key="g.id"
            @click="store.selectedLetterGroup = g.id"
            class="px-3 py-1 rounded text-sm"
            :class="store.selectedLetterGroup === g.id ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'">
            {{ g.label }}
          </button>
          <span class="ml-auto text-gray-400 text-sm self-center">
            共 {{ store.filteredWrongAnswers.length }} 条记录，{{ store.uniqueWrongChars.length }} 个不同字母
          </span>
        </div>

        <div v-if="store.filteredWrongAnswers.length === 0" class="text-center py-12 text-gray-500">
          <div class="text-5xl mb-2">🎉</div>
          <div>暂无错题记录，去训练模式答题吧！</div>
        </div>

        <div v-else class="space-y-2 max-h-[500px] overflow-y-auto pr-2">
          <div v-for="(w, i) in store.filteredWrongAnswers" :key="w.timestamp"
            class="bg-gray-800 rounded-lg p-3 flex items-center gap-4">
            <div class="text-4xl font-bold text-red-400 w-12 text-center">{{ w.char }}</div>
            <div class="flex gap-4 items-center">
              <div class="flex flex-col items-center">
                <div class="text-xs text-gray-500 mb-1">错误答案</div>
                <BrailleCell :dots="w.wrongDots" :size="30" />
                <div class="text-xs text-gray-500 mt-1">[{{ w.wrongDots.join(',') || '空' }}]</div>
              </div>
              <div class="text-gray-500">→</div>
              <div class="flex flex-col items-center">
                <div class="text-xs text-green-400 mb-1">正确答案</div>
                <BrailleCell :dots="w.correctDots" :size="30" />
                <div class="text-xs text-gray-500 mt-1">[{{ w.correctDots.join(',') }}]</div>
              </div>
            </div>
            <div class="ml-auto flex flex-col items-end gap-1">
              <div class="text-xs text-gray-500">{{ new Date(w.timestamp).toLocaleString() }}</div>
              <div class="text-xs text-purple-400">复习次数: {{ w.reviewCount }}</div>
              <button @click="store.removeWrongAnswer(i)"
                class="text-xs text-red-400 hover:text-red-300 hover:underline">删除此条</button>
            </div>
          </div>
        </div>

        <!-- Unique wrong chars quick view -->
        <div v-if="store.uniqueWrongChars.length > 0" class="mt-6 pt-4 border-t border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-purple-300 font-bold">错字汇总（按字母去重）</h4>
          </div>
          <div class="flex flex-wrap gap-3">
            <div v-for="c in store.uniqueWrongChars" :key="c"
              class="bg-gray-800 rounded-lg p-2 flex flex-col items-center gap-1">
              <div class="text-xl font-bold text-red-400">{{ c }}</div>
              <BrailleCell :dots="BRAILLE_MAP[c] || []" :size="28" />
              <button @click="store.removeWrongChar(c)"
                class="text-xs text-gray-500 hover:text-red-400">从错题本移除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reference -->
    <div v-if="activeTab === 'ref'" class="bg-gray-900 rounded-xl p-4">
      <h3 class="text-purple-300 font-bold mb-3">盲文速查表</h3>
      <div class="grid grid-cols-6 md:grid-cols-9 gap-3">
        <div v-for="(dots, char) in brailleMap" :key="char" class="flex flex-col items-center">
          <div class="text-xl font-bold text-purple-400">{{ char }}</div>
          <BrailleCell :dots="dots" :size="30" />
          <div class="text-xs text-gray-500">{{ dots.join(',') }}</div>
        </div>
      </div>
    </div>

    <button @click="doExport" class="bg-green-700 px-4 py-2 rounded self-start hover:bg-green-600 text-sm">
      导出翻译文本
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBrailleStore } from './store/braille'
import { BRAILLE_MAP } from './utils/braille'
import BrailleCell from './components/BrailleCell.vue'
import type { LetterGroup } from './types'

const store = useBrailleStore()
const brailleMap = BRAILLE_MAP
const tabs = [
  { id: 'translate', label: '翻译模式' },
  { id: 'learn', label: '训练模式' },
  { id: 'wrongbook', label: '错题本' },
  { id: 'ref', label: '速查表' },
]

const letterGroups: { id: LetterGroup; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'A-E', label: 'A-E' },
  { id: 'F-J', label: 'F-J' },
  { id: 'K-O', label: 'K-O' },
  { id: 'P-T', label: 'P-T' },
  { id: 'U-Z', label: 'U-Z' },
]

const reviewFeedback = ref<{ show: boolean; correct: boolean }>({ show: false, correct: false })
const activeTab = ref('translate')

function doExport() {
  const text = store.exportPDF()
  const blob = new Blob([text], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'braille-output.txt'
  a.click()
}
</script>
