import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Tag } from 'antd';
import { RobotOutlined, UserOutlined, SendOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { askAgent, clearAgentHistory } from '../config/api';

const { Title, Text } = Typography;

const ACTION_CARDS = [
  { label: 'Which regime saves more?',   icon: '⚖️' },
  { label: 'How to maximize 80C?',       icon: '💰' },
  { label: 'Am I paying too much tax?',  icon: '🔍' },
  { label: 'What is LTCG harvesting?',   icon: '📈' },
];

// Typing dots animation component
const TypingIndicator = () => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', background: '#F2F3F4',
    borderRadius: 16, borderBottomLeftRadius: 4, float: 'left', clear: 'both'
  }}>
    <RobotOutlined style={{ color: '#084C8D', fontSize: 15 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#5B92E5',
          animation: 'drainzero-bounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
    <Text style={{ color: '#6B7280', fontSize: 13 }}>DrainZero is thinking...</Text>
    <style>{`
      @keyframes drainzero-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30%            { transform: translateY(-6px); opacity: 1; }
      }
    `}</style>
  </div>
);

const TaxAssistantChatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages]     = useState([
    { role: 'bot', text: 'Hi! I am your AI Tax Assistant powered by DrainZero + Gemini.\n\nI know your income, deductions, and profile. Ask me anything about your tax situation.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading]       = useState(false);
  const [showCards, setShowCards]   = useState(true);
  const messagesEndRef              = useRef(null);

  useEffect(() => {
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setShowCards(false);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInputValue('');
    setLoading(true);

    try {
      if (!user) throw new Error('Please login to use the AI assistant.');
      const result = await askAgent(user.id, text);
      const reply  = result.answer || result.message || 'I could not process that. Please try again.';
      const actionCards = result.action_cards || [];
      setMessages(prev => [...prev, { role: 'bot', text: reply, actionCards }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: `Something went wrong: ${err.message}. The backend may be starting up — please try again in 30 seconds.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (user) await clearAgentHistory(user.id).catch(() => {});
    setMessages([{ role: 'bot', text: 'Conversation cleared. How can I help you with your taxes?' }]);
    setShowCards(true);
  };

  return (
    <Card
      style={{ marginTop: 40, borderRadius: 24, border: '1px solid #B8C8E6', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #08457E 0%, #0D6EBA 100%)',
        padding: '20px 24px', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RobotOutlined style={{ fontSize: 22, color: '#FFFFFF' }} />
          </div>
          <div>
            <Title level={4} style={{ color: '#FFFFFF', margin: 0, fontSize: 16 }}>AI Tax Assistant</Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
              <Text style={{ color: '#CCF1FF', fontSize: 12 }}>Powered by DrainZero + Gemini · RAG Enabled</Text>
            </div>
          </div>
        </div>
        <Button icon={<DeleteOutlined />} size="small" onClick={handleClear}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#CCF1FF', borderRadius: 8 }} />
      </div>

      {/* Chat area */}
      <div style={{ padding: 24, background: '#FFFFFF', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <div style={{ height: 300, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 6 }}>
          {messages.map((msg, i) => (
            <div key={i}>
              <div style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #5B92E5, #08457E)' : '#F2F3F4',
                color: msg.role === 'user' ? '#FFF' : '#1F2937',
                padding: '12px 16px', borderRadius: 16, maxWidth: '88%',
                borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                borderBottomLeftRadius : msg.role === 'bot'  ? 4 : 16,
                display: 'inline-block',
                float: msg.role === 'user' ? 'right' : 'left',
                clear: 'both',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <Space size={8} align="start" style={{ display: 'flex' }}>
                  {msg.role === 'bot' && <RobotOutlined style={{ fontSize: 15, marginTop: 3, color: '#084C8D', flexShrink: 0 }} />}
                  <Text style={{ color: 'inherit', display: 'block', whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.6 }}>{msg.text}</Text>
                  {msg.role === 'user' && <UserOutlined style={{ fontSize: 15, marginTop: 3, color: '#FFF', flexShrink: 0 }} />}
                </Space>
              </div>

              {msg.role === 'bot' && msg.actionCards?.length > 0 && (
                <div style={{ clear: 'both', marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {msg.actionCards.map((card, ci) => (
                    <Tag key={ci} onClick={() => sendMessage(card)}
                      style={{ cursor: 'pointer', borderRadius: 20, padding: '6px 14px', fontSize: 12, background: '#EEF3FA', color: '#08457E', border: '1px solid #B8C8E6' }}>
                      <ThunderboltOutlined style={{ marginRight: 4 }} />{card}
                    </Tag>
                  ))}
                </div>
              )}
              <div style={{ clear: 'both' }} />
            </div>
          ))}

          {loading && (
            <div>
              <TypingIndicator />
              <div style={{ clear: 'both' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Cards */}
        {showCards && (
          <div style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 10 }}>Quick Questions</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ACTION_CARDS.map((card, i) => (
                <button key={i} onClick={() => sendMessage(card.label)}
                  style={{
                    background: '#F2F3F4', border: '1px solid #B8C8E6', borderRadius: 20,
                    padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: '#08457E',
                    fontFamily: "'Outfit', sans-serif", fontWeight: 500, transition: 'all 0.2s ease',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#EEF3FA'; e.currentTarget.style.borderColor = '#5B92E5'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#F2F3F4'; e.currentTarget.style.borderColor = '#B8C8E6'; }}
                >
                  {card.icon} {card.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <Space.Compact style={{ width: '100%' }}>
          <Input size="large" placeholder="Ask a tax question..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onPressEnter={() => sendMessage(inputValue)}
            disabled={loading}
            style={{ borderRadius: '12px 0 0 12px', background: '#F9FAFB' }}
          />
          <Button type="primary" size="large" icon={<SendOutlined />}
            onClick={() => sendMessage(inputValue)}
            loading={loading}
            style={{ borderRadius: '0 12px 12px 0', background: '#5B92E5', border: 'none', width: 60 }}
          />
        </Space.Compact>
      </div>
    </Card>
  );
};

export default TaxAssistantChatbot;
