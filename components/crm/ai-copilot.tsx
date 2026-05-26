'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AICopilotProps {
  open: boolean
  onClose: () => void
  prospectName?: string
  prospectContext?: Record<string, unknown>
}

const SUGGESTED_PROMPTS = [
  'How many Class A PMs in Brickell with score >80 did we win last quarter?',
  'Draft follow-up with SOW attached',
  "What's our avg close time on healthcare prospects?",
  'Find prospects with intent score >70 not contacted',
  'Summarize last 5 lost deals — common pattern?',
]

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#78716C',
            display: 'inline-block',
            animation: 'pulseDot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function AICopilot({ open, onClose, prospectName, prospectContext }: AICopilotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setThinking(true)

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          context: { prospectName, ...(prospectContext || {}) },
        }),
      })
      const data = await res.json()
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || data.error || 'Something went wrong.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Could not reach the Copilot API. Please check your connection.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setThinking(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.32)',
          zIndex: 49,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 280ms cubic-bezier(.4,0,.2,1)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 420,
          background: '#FAFAF9',
          borderLeft: '1px solid #E7E5E4',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(.4,0,.2,1)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #E7E5E4',
            background: '#FFF',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              ✦
            </span>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#1C1917' }}>Copilot</span>
            {prospectName && (
              <span
                style={{
                  fontSize: 12,
                  color: '#78716C',
                  background: '#F5F5F4',
                  padding: '2px 8px',
                  borderRadius: 10,
                  border: '1px solid #E7E5E4',
                }}
              >
                {prospectName}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid #E7E5E4',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#78716C',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {messages.length === 0 && !thinking && (
            <div>
              <p
                style={{
                  fontSize: 13,
                  color: '#78716C',
                  marginBottom: 12,
                  fontWeight: 500,
                }}
              >
                Suggested prompts
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    style={{
                      padding: '8px 12px',
                      background: '#FFF',
                      border: '1px solid #E7E5E4',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 12,
                      color: '#1C1917',
                      lineHeight: 1.4,
                      transition: 'border-color 150ms, background 150ms',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#4F46E5'
                      ;(e.currentTarget as HTMLButtonElement).style.background = '#F5F3FF'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#E7E5E4'
                      ;(e.currentTarget as HTMLButtonElement).style.background = '#FFF'
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? '#EEF2FF' : '#FFF',
                  border: msg.role === 'user' ? '1px solid #C7D2FE' : '1px solid #E7E5E4',
                  fontSize: 13,
                  color: '#1C1917',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {thinking && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  background: '#FFF',
                  border: '1px solid #E7E5E4',
                  borderRadius: '14px 14px 14px 4px',
                }}
              >
                <ThinkingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #E7E5E4',
            background: '#FFF',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              background: '#FAFAF9',
              border: '1px solid #E7E5E4',
              borderRadius: 10,
              padding: '8px 12px',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${prospectName ? prospectName : 'this prospect'}...`}
              rows={1}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                resize: 'none',
                outline: 'none',
                fontSize: 13,
                color: '#1C1917',
                lineHeight: 1.5,
                fontFamily: 'inherit',
                maxHeight: 100,
                overflow: 'auto',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || thinking}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                background: input.trim() && !thinking ? '#4F46E5' : '#E7E5E4',
                cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 150ms',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 10V2M2 6L6 2L10 6"
                  stroke={input.trim() && !thinking ? '#FFF' : '#78716C'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#A8A29E', marginTop: 6, textAlign: 'center' }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  )
}
