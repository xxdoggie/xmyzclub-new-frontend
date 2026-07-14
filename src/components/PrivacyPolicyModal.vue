<script setup lang="ts">
defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="privacy-overlay" @click.self="emit('close')">
        <div class="privacy-modal">
          <div class="privacy-header">
            <h3 class="privacy-title">隐私政策</h3>
            <button class="privacy-close" @click="emit('close')">&times;</button>
          </div>
          <div class="privacy-body">
            <p class="privacy-update">最后更新日期：2026年4月17日</p>

            <p>
              厦门一中学生社区（以下简称"本平台"）是由学生自主运营的非官方校园社区，与厦门一中及其校园网平台无隶属关系。我们重视您的隐私，本政策说明我们如何收集、使用和保护您的个人信息。
            </p>

            <h4>一、我们收集的信息</h4>
            <p>根据您使用的登录方式，我们可能收集以下信息：</p>
            <ul>
              <li><strong>普通注册：</strong>用户名、密码（加密存储）</li>
              <li><strong>校园网登录：</strong>学号、姓名、班级等校园网返回的基本信息</li>
              <li><strong>QQ 登录：</strong>QQ 昵称、头像、OpenID</li>
              <li><strong>手机号登录：</strong>手机号码</li>
            </ul>

            <h4>二、信息的用途</h4>
            <ul>
              <li>完成注册和登录流程</li>
              <li>验证您的学生身份</li>
              <li>在社区内展示您选择公开的信息（如昵称、班级）</li>
              <li>维护平台安全，防止滥用</li>
            </ul>

            <h4>三、关于校园网登录</h4>
            <p>
              当您使用校园网方式登录时，您的校园网密码仅用于实时验证身份，验证完成后<strong>不会被保存</strong>。我们<strong>不会</strong>使用您的校园网账号进行登录以外的任何操作。
            </p>

            <h4>四、信息安全</h4>
            <ul>
              <li>账号密码经过加密处理后存储</li>
              <li>网络传输使用 HTTPS 加密</li>
              <li>数据库访问严格限制权限</li>
              <li>本平台不向任何第三方出售或共享您的个人信息</li>
            </ul>

            <h4>五、您的权利</h4>
            <ul>
              <li>您可以随时在设置中解绑校园网、QQ 或手机号</li>
              <li>您可以自主设置个人资料的可见范围</li>
              <li>您可以联系管理员申请删除账号及所有相关数据</li>
            </ul>

            <h4>六、政策变更</h4>
            <p>本隐私政策可能会不时更新。重大变更时我们会通过平台公告通知您。继续使用本平台即表示您同意更新后的政策。</p>
          </div>
          <div class="privacy-footer">
            <button class="btn-confirm" @click="emit('close')">我已了解</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.privacy-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  z-index: 3000;
  backdrop-filter: blur(4px);
}

.privacy-modal {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.privacy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.privacy-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.privacy-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.privacy-close:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.privacy-body {
  padding: var(--spacing-lg);
  overflow-y: auto;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
}

.privacy-body h4 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
}

.privacy-body h4:first-of-type {
  margin-top: var(--spacing-md);
}

.privacy-body p {
  margin-bottom: var(--spacing-sm);
}

.privacy-body ul {
  padding-left: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
}

.privacy-body li {
  margin-bottom: var(--spacing-xs);
}

.privacy-update {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-bottom: var(--spacing-md);
}

.privacy-footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.btn-confirm {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn-confirm:hover {
  background: var(--color-primary-dark);
}

/* Modal 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-enter-active .privacy-modal,
.modal-leave-active .privacy-modal {
  transition: transform var(--transition-normal), opacity var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .privacy-modal {
  transform: scale(0.95);
  opacity: 0;
}

.modal-leave-to .privacy-modal {
  transform: scale(0.95);
  opacity: 0;
}
</style>
