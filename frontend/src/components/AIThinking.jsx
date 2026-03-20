/**
 * AIThinking — 可复用的 AI 思考过程展示组件
 *
 * 通过 SSE (Server-Sent Events) 实时接收 AI 输出并逐字展示，
 * 带有打字机效果和渐变动画，可用于任务拆解、内容总结等场景。
 *
 * Props:
 *   visible    {boolean}  是否显示弹窗
 *   title      {string}   弹窗标题
 *   sseUrl     {string}   SSE 请求地址（POST）
 *   onDone     {(data) => void}  流式完成后的回调，data = done event 的 payload
 *   onError    {(msg) => void}   出错回调
 *   onClose    {() => void}      关闭弹窗
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Modal, Typography, Spin, Tag, Space } from 'antd'
import { RobotOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons'

const { Text } = Typography

// ── 状态常量 ────────────────────────────────────────────
const STATUS = {
  CONNECTING: 'connecting',
  THINKING: 'thinking',
  DONE: 'done',
  ERROR: 'error',
}

const statusConfig = {
  [STATUS.CONNECTING]: { label: '连接中...', color: 'processing' },
  [STATUS.THINKING]:   { label: 'AI 思考中', color: 'purple' },
  [STATUS.DONE]:       { label: '完成', color: 'success' },
  [STATUS.ERROR]:      { label: '出错', color: 'error' },
}

// ── 组件 ────────────────────────────────────────────────
function AIThinking({ visible, title = 'AI 分析中', sseUrl, onDone, onError, onClose }) {
  const [status, setStatus] = useState(STATUS.CONNECTING)
  const [thinkingText, setThinkingText] = useState('')
  const contentRef = useRef(null)
  const abortRef = useRef(null)

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [thinkingText, scrollToBottom])

  // ── 发起 SSE 请求 ──────────────────────────────
  useEffect(() => {
    if (!visible || !sseUrl) return

    const controller = new AbortController()
    abortRef.current = controller
    setThinkingText('')
    setStatus(STATUS.CONNECTING)

    ;(async () => {
      try {
        const response = await fetch(sseUrl, {
          method: 'POST',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        setStatus(STATUS.THINKING)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let currentEvent = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              const dataStr = line.slice(6)
              try {
                const data = JSON.parse(dataStr)
                if (currentEvent === 'thinking') {
                  setThinkingText(prev => prev + data.text)
                } else if (currentEvent === 'done') {
                  setStatus(STATUS.DONE)
                  onDone?.(data)
                } else if (currentEvent === 'error') {
                  setStatus(STATUS.ERROR)
                  onError?.(data.message)
                }
              } catch {
                // ignore parse error
              }
              currentEvent = ''
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setStatus(STATUS.ERROR)
          onError?.(err.message || '连接失败')
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [visible, sseUrl])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    abortRef.current?.abort()
    onClose?.()
  }

  const cfg = statusConfig[status]

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#722ed1' }} />
          <span>{title}</span>
          <Tag
            color={cfg.color}
            icon={status === STATUS.THINKING ? <LoadingOutlined /> :
                  status === STATUS.DONE ? <CheckCircleOutlined /> : null}
          >
            {cfg.label}
          </Tag>
        </Space>
      }
      open={visible}
      footer={status === STATUS.DONE || status === STATUS.ERROR ? (
        <button
          onClick={handleClose}
          style={{
            cursor: 'pointer',
            padding: '6px 20px',
            border: 'none',
            borderRadius: 6,
            background: '#722ed1',
            color: '#fff',
            fontSize: 14,
          }}
        >
          {status === STATUS.DONE ? '完成' : '关闭'}
        </button>
      ) : null}
      onCancel={handleClose}
      width={640}
      destroyOnClose
      maskClosable={false}
      styles={{ body: { padding: 0 } }}
    >
      {/* 思考内容区域 */}
      <div
        ref={contentRef}
        style={{
          height: 360,
          overflow: 'auto',
          padding: '16px 20px',
          background: '#1a1a2e',
          borderRadius: 6,
          margin: '0',
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        {status === STATUS.CONNECTING && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ color: '#999', marginTop: 12 }}>正在连接 AI 服务...</div>
          </div>
        )}

        {thinkingText && (
          <pre style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#e0e0e0',
          }}>
            {thinkingText.split(/(```json[\s\S]*?```|```[\s\S]*?```)/g).map((part, i) => {
              if (part.startsWith('```')) {
                return (
                  <code key={i} style={{
                    display: 'block',
                    background: '#0d1117',
                    border: '1px solid #333',
                    borderRadius: 4,
                    padding: '8px 12px',
                    margin: '8px 0',
                    color: '#7ee787',
                    fontSize: 12,
                  }}>
                    {part.replace(/^```json\n?/, '').replace(/\n?```$/, '')}
                  </code>
                )
              }
              return <span key={i}>{part}</span>
            })}
            {status === STATUS.THINKING && (
              <span className="ai-cursor" style={{
                display: 'inline-block',
                width: 8,
                height: 16,
                background: '#722ed1',
                marginLeft: 2,
                verticalAlign: 'text-bottom',
                animation: 'blink 1s infinite',
              }} />
            )}
          </pre>
        )}
      </div>

      {/* 光标闪烁动画 */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </Modal>
  )
}

export default AIThinking
