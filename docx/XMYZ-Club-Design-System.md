# XMYZ Club 配色方案

> 厦门一中学生社区 - 配色规范 v1.0

---

## 主色系

| 名称 | 色值 | 用途 |
|------|------|------|
| 主色 | `#E74C3C` | 按钮、链接、重要元素 |
| 主色-浅 | `#FF6B6B` | hover 状态、渐变 |
| 主色-深 | `#C0392B` | active 状态、强调 |
| 主色-背景 | `rgba(231, 76, 60, 0.08)` | 浅色背景、标签 |

## 辅助色

| 名称 | 色值 | 用途 |
|------|------|------|
| 辅助色 | `#06B6D4` | 次要功能、信息展示 |
| 辅助色-浅 | `#22D3EE` | hover、渐变 |
| 强调色 | `#F59E0B` | 徽章、高亮、金色元素 |

## 中性色（亮色模式）

| 名称 | 色值 | 用途 |
|------|------|------|
| 背景色 | `#F9FAFB` | 页面背景 |
| 卡片色 | `#FFFFFF` | 卡片、容器背景 |
| 边框色 | `#E5E7EB` | 分割线、边框 |
| 主文字 | `#1F2937` | 标题、正文 |
| 次要文字 | `#6B7280` | 描述、说明 |
| 占位符 | `#9CA3AF` | 输入框占位符 |

## 中性色（暗色模式）

| 名称 | 色值 | 用途 |
|------|------|------|
| 背景色 | `#111827` | 页面背景 |
| 卡片色 | `#1F2937` | 卡片、容器背景 |
| 边框色 | `#374151` | 分割线、边框 |
| 主文字 | `#F9FAFB` | 标题、正文 |
| 次要文字 | `#9CA3AF` | 描述、说明 |
| 占位符 | `#6B7280` | 输入框占位符 |

## 状态色

| 状态 | 色值 | 用途 |
|------|------|------|
| 成功 | `#10B981` | 操作成功、在线状态 |
| 警告 | `#F59E0B` | 提醒、待处理 |
| 错误 | `#EF4444` | 错误、删除 |
| 信息 | `#3B82F6` | 提示、链接 |

---

## CSS 变量

```css
:root {
  /* 主色 */
  --color-primary: #E74C3C;
  --color-primary-light: #FF6B6B;
  --color-primary-dark: #C0392B;
  --color-primary-bg: rgba(231, 76, 60, 0.08);
  
  /* 辅助色 */
  --color-secondary: #06B6D4;
  --color-secondary-light: #22D3EE;
  --color-accent: #F59E0B;
  
  /* 中性色 */
  --color-bg: #F9FAFB;
  --color-card: #FFFFFF;
  --color-border: #E5E7EB;
  --color-text: #1F2937;
  --color-text-secondary: #6B7280;
  --color-text-placeholder: #9CA3AF;
  
  /* 状态色 */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
}

/* 暗色模式 */
.dark {
  --color-bg: #111827;
  --color-card: #1F2937;
  --color-border: #374151;
  --color-text: #F9FAFB;
  --color-text-secondary: #9CA3AF;
  --color-text-placeholder: #6B7280;
}
```

---

## Tailwind 配置

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E74C3C',
          light: '#FF6B6B',
          dark: '#C0392B',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          light: '#22D3EE',
        },
        accent: '#F59E0B',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
  },
}
```