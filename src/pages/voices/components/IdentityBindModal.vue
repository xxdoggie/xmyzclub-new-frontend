<script setup lang="ts">
import { computed, ref } from 'vue'
import { bindVoiceIdentity } from '@/api/voices'
import { useVxNotice } from '../composables/useVxNotice'
import { IDENTITY_LABELS, VOICE_IDENTITIES, type VoiceIdentity } from '@/types/voices'
import IdentityIcon from './IdentityIcon.vue'
import VxPen from './VxPen.vue'

const emit = defineEmits<{
  bound: [identity: VoiceIdentity]
  close: []
}>()

const notice = useVxNotice()
const selected = ref<VoiceIdentity | null>(null)
const submitting = ref(false)
// select=选择身份 confirm=二级确认 stamping=盖章动画
const stage = ref<'select' | 'confirm' | 'stamping'>('select')

const selectedLabel = computed(() => (selected.value ? IDENTITY_LABELS[selected.value] : ''))

function onMaskClick() {
  if (stage.value === 'select') emit('close')
}

async function confirm() {
  if (!selected.value || submitting.value) return
  submitting.value = true
  try {
    const res = await bindVoiceIdentity(selected.value)
    if (res.data.code === 200) {
      // 盖章动画：聚焦选中的身份，盖上"已登记"，随后关闭
      stage.value = 'stamping'
      const identity = selected.value
      setTimeout(() => emit('bound', identity), 1600)
    } else {
      stage.value = 'select'
      notice.error(res.data.message || '绑定失败')
    }
  } catch {
    stage.value = 'select'
    notice.error('网络错误，请稍后再试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="vx-modal-mask" :class="{ 'bind-mask--stamping': stage === 'stamping' }" @click.self="onMaskClick">
    <div class="vx-modal" :class="{ 'bind-modal--stamping': stage === 'stamping' }">
      <div class="vx-exam-head bind-dimmable">
        <h3>考生信息登记表</h3>
      </div>
      <p class="bind-tip bind-dimmable">
        选择你现在的身份。登记后<b>不可修改</b>，它将出现在你出的每一份卷子和每一份答卷上（全程匿名，只展示身份）。
      </p>
      <div class="bind-options">
        <button
          v-for="id in VOICE_IDENTITIES"
          :key="id"
          class="bind-option"
          :class="{
            'bind-option--active': selected === id,
            'bind-option--dim': stage === 'stamping' && selected !== id,
            'bind-option--spot': stage === 'stamping' && selected === id,
          }"
          type="button"
          :disabled="stage !== 'select'"
          @click="selected = id"
        >
          <IdentityIcon :identity="id" :size="30" class="bind-option-icon" />
          <span>{{ IDENTITY_LABELS[id] }}</span>
          <span v-if="stage === 'stamping' && selected === id" class="bind-stamp">已登记</span>
        </button>
      </div>
      <div class="bind-actions bind-dimmable">
        <button class="vx-btn vx-btn--sm" type="button" :disabled="stage !== 'select'" @click="emit('close')">再想想</button>
        <button
          class="vx-btn vx-btn--red vx-btn--sm"
          type="button"
          :disabled="!selected || stage !== 'select'"
          @click="stage = 'confirm'"
        >
          确认登记
        </button>
      </div>
    </div>

    <!-- 二级确认窗口 -->
    <Transition name="vx-modal">
      <div v-if="stage === 'confirm'" class="bind-confirm-mask" @click.self="stage = 'select'">
        <div class="vx-modal bind-confirm">
          <p class="bind-confirm-text">
            请再次确认：你的考生身份是
            <br />
            <b class="vx-kaiti">「{{ selectedLabel }}」</b>
            <br />
            <span class="bind-confirm-sub">登记后不可修改</span>
          </p>
          <div class="bind-actions">
            <button class="vx-btn vx-btn--sm" type="button" :disabled="submitting" @click="stage = 'select'">
              返回修改
            </button>
            <button class="vx-btn vx-btn--red vx-btn--sm" type="button" :disabled="submitting" @click="confirm">
              <template v-if="submitting"><VxPen /> 登记中…</template>
              <template v-else>确认无误</template>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bind-tip {
  font-size: 13px;
  line-height: 1.7;
  color: var(--vx-ink-faint);
  margin: 0 0 16px;
}

.bind-tip b {
  color: var(--vx-red);
}

.bind-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.bind-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-family: var(--vx-kaiti);
  font-size: 19px;
  font-weight: 700;
  color: var(--vx-ink);
  padding: 14px 8px 12px;
  background: var(--vx-paper-dim);
  border: 1.5px dashed var(--vx-line-dash);
  cursor: pointer;
  transition: all 0.3s ease;
}

.bind-option:disabled {
  cursor: default;
}

.bind-option-icon {
  margin-right: 0;
}

.bind-option--active {
  border: 1.5px solid var(--vx-red);
  color: var(--vx-red);
  background: var(--vx-paper);
  transform: rotate(-2deg) scale(1.04);
  box-shadow: 2px 2px 0 rgba(120, 110, 90, 0.3);
}

.bind-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

/* ---------- 盖章阶段：全场变暗，只留选中的身份 ---------- */
.bind-mask--stamping {
  background: rgba(12, 9, 6, 0.92);
  transition: background 0.4s ease;
}

.bind-modal--stamping {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  transition: all 0.4s ease;
}

.bind-modal--stamping .bind-dimmable {
  opacity: 0.06;
  transition: opacity 0.4s ease;
}

.bind-option--dim {
  opacity: 0.06;
  transition: opacity 0.4s ease;
}

.bind-option--spot {
  background: var(--vx-paper);
  transform: rotate(0deg) scale(1.12);
  box-shadow: 0 0 0 3px rgba(253, 251, 244, 0.25), 0 10px 34px rgba(0, 0, 0, 0.5);
  z-index: 2;
}

/* 印章砸下 */
.bind-stamp {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 76px;
  height: 76px;
  border: 3px solid var(--vx-red);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vx-serif);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--vx-red);
  background: rgba(253, 251, 244, 0.6);
  transform: rotate(-14deg);
  animation: bind-stamp-in 0.55s cubic-bezier(0.2, 1.4, 0.4, 1) 0.35s both;
  pointer-events: none;
}

@keyframes bind-stamp-in {
  0% {
    transform: rotate(-30deg) scale(2.6);
    opacity: 0;
  }
  55% {
    transform: rotate(-12deg) scale(0.92);
    opacity: 1;
  }
  75% {
    transform: rotate(-15deg) scale(1.05);
  }
  100% {
    transform: rotate(-14deg) scale(1);
  }
}

/* ---------- 二级确认 ---------- */
.bind-confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(26, 22, 17, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1010;
  padding: 20px;
}

.bind-confirm {
  max-width: 320px;
}

.bind-confirm-text {
  font-size: 15px;
  line-height: 1.9;
  color: var(--vx-ink);
  margin: 0;
  text-align: center;
}

.bind-confirm-text b {
  font-size: 20px;
  color: var(--vx-red);
}

.bind-confirm-sub {
  font-size: 12px;
  color: var(--vx-ink-faint);
}

.bind-confirm .bind-actions {
  justify-content: center;
}
</style>
