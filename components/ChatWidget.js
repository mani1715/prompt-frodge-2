'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Chat state
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Retrieve from another device
  const [showRetrieve, setShowRetrieve] = useState(false);
  const [retrieveEmail, setRetrieveEmail] = useState('');
  const [retrievePhone, setRetrievePhone] = useState('');
  
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('chatSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setChatId(session.chatId);
        setCustomerName(session.customerName);
        setCustomerEmail(session.customerEmail);
        setCustomerPhone(session.customerPhone || '');
        setMessages(session.messages || []);
        setHasSession(true);
        
        // Start polling for admin replies
        startPolling(session.chatId, session.customerEmail, session.customerPhone);
      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem('chatSession');
      }
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  const startPolling = (id, email, phone) => {
    // Poll every 10 seconds for new messages
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }
    
    pollInterval.current = setInterval(async () => {
      try {
        const params = new URLSearchParams();
        if (email) params.append('email', email);
        if (phone) params.append('phone', phone);
        
        const response = await fetch(`/api/chat/history?${params.toString()}`);
        const data = await response.json();
        
        if (data.success && data.conversation) {
          const newMessages = data.conversation.messages || [];
          setMessages(newMessages);
          
          // Update localStorage
          saveSession(id, email, phone, newMessages);
          
          // Check for new admin messages
          const lastLocalMessage = messages[messages.length - 1];
          const lastServerMessage = newMessages[newMessages.length - 1];
          
          if (lastServerMessage && lastServerMessage.sender === 'admin' && 
              (!lastLocalMessage || lastServerMessage.id !== lastLocalMessage.id)) {
            setUnreadCount(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 10000); // 10 seconds
  };

  const saveSession = (id, email, phone, msgs) => {
    const session = {
      chatId: id,
      customerName,
      customerEmail: email,
      customerPhone: phone,
      messages: msgs
    };
    localStorage.setItem('chatSession', JSON.stringify(session));
  };

  const handleStartChat = async () => {
    if (!customerName.trim() || !customerEmail.trim() || !newMessage.trim()) {
      alert('Please fill in your name, email, and message');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          message: newMessage.trim()
        })
      });

      const data = await response.json();
      
      if (data.success && data.conversation) {
        setChatId(data.chatId);
        setMessages(data.conversation.messages);
        setHasSession(true);
        setNewMessage('');
        
        // Save to localStorage
        saveSession(data.chatId, customerEmail.trim(), customerPhone.trim(), data.conversation.messages);
        
        // Start polling for replies
        startPolling(data.chatId, customerEmail.trim(), customerPhone.trim());
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          message: newMessage.trim()
        })
      });

      const data = await response.json();
      
      if (data.success && data.conversation) {
        setMessages(data.conversation.messages);
        setNewMessage('');
        saveSession(chatId, customerEmail, customerPhone, data.conversation.messages);
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleRetrieveChat = async () => {
    if (!retrieveEmail.trim() && !retrievePhone.trim()) {
      alert('Please enter your email or phone number');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (retrieveEmail.trim()) params.append('email', retrieveEmail.trim());
      if (retrievePhone.trim()) params.append('phone', retrievePhone.trim());
      
      const response = await fetch(`/api/chat/history?${params.toString()}`);
      const data = await response.json();
      
      if (data.success && data.conversation) {
        setChatId(data.conversation.id);
        setCustomerName(data.conversation.customerName);
        setCustomerEmail(data.conversation.customerEmail);
        setCustomerPhone(data.conversation.customerPhone);
        setMessages(data.conversation.messages);
        setHasSession(true);
        setShowRetrieve(false);
        
        // Save to localStorage
        saveSession(
          data.conversation.id,
          data.conversation.customerEmail,
          data.conversation.customerPhone,
          data.conversation.messages
        );
        
        // Start polling
        startPolling(
          data.conversation.id,
          data.conversation.customerEmail,
          data.conversation.customerPhone
        );
      } else {
        alert('No conversation found with that email/phone. Start a new chat!');
        setShowRetrieve(false);
      }
    } catch (error) {
      console.error('Error retrieving chat:', error);
      alert('Failed to retrieve conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    if (confirm('Start a new conversation? Your current chat will remain saved.')) {
      localStorage.removeItem('chatSession');
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      setChatId('');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setMessages([]);
      setNewMessage('');
      setHasSession(false);
      setUnreadCount(0);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 bg-black text-white rounded-full p-4 shadow-lg hover:bg-gray-800 transition-all duration-300 z-50 group"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Chat with us
          </span>
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-black text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Chat with us</h3>
              <p className="text-xs text-gray-300">We'll respond as soon as possible</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-gray-800 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!hasSession && !showRetrieve ? (
              // Initial Form
              <div className="p-4 space-y-3 overflow-y-auto">
                <p className="text-sm text-gray-600 mb-4">
                  Start a conversation with us! Your chat will be saved on this device.
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  onClick={handleStartChat}
                  disabled={sending}
                  className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Start Chat
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowRetrieve(true)}
                  className="w-full text-sm text-gray-600 hover:text-black transition-colors py-2"
                >
                  Continue conversation from another device?
                </button>
              </div>
            ) : showRetrieve ? (
              // Retrieve Chat Form
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setShowRetrieve(false)}
                  className="text-sm text-gray-600 hover:text-black mb-2"
                >
                  ← Back
                </button>
                
                <p className="text-sm text-gray-600 mb-4">
                  Enter your email or phone number to retrieve your conversation history.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={retrieveEmail}
                    onChange={(e) => setRetrieveEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={retrievePhone}
                    onChange={(e) => setRetrievePhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="+1234567890"
                  />
                </div>

                <button
                  onClick={handleRetrieveChat}
                  disabled={loading}
                  className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Retrieving...
                    </>
                  ) : (
                    'Retrieve Conversation'
                  )}
                </button>
              </div>
            ) : (
              // Chat Messages
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <p className="text-xs text-gray-500">
                      Chatting as: <span className="font-medium">{customerName}</span>
                    </p>
                    <button
                      onClick={handleNewChat}
                      className="text-xs text-gray-600 hover:text-black"
                    >
                      New Chat
                    </button>
                  </div>

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-lg ${
                          msg.sender === 'customer'
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender === 'customer' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Type your message..."
                      disabled={sending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
