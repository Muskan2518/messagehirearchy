import React, { useEffect, useState } from 'react';

const Dashboard = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [loadingRegeneration, setLoadingRegeneration] = useState(false);
  const [loadingRespond, setLoadingRespond] = useState(false);
  const [error, setError] = useState(null);
  const [showTreeView, setShowTreeView] = useState(false); // New state for tree view

  const token = sessionStorage.getItem('sessionToken');

  const handleLogout = () => {
    sessionStorage.removeItem('sessionToken');
    window.location.href = '/signin';
  };

  const fetchChatHistory = async () => {
    if (!token) {
      setError('Unauthorized. Please sign in.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/getChatHistory', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }

      const data = await response.json();
      setChatHistory(data.history || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load chat history.');
    }
  };

  const handleCreateNewChat = async () => {
    const title = prompt('Enter a title for the new chat:');
    if (!title) return;

    try {
      const response = await fetch('http://localhost:5000/createNewChat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      await response.json();
      alert('Chat created successfully!');
      fetchChatHistory();
    } catch (error) {
      console.error(error);
      alert('Error creating chat: ' + error.message);
    }
  };

  const fetchSpecificChat = async (chatId, title) => {
    setSelectedChat({ title, chatId });
    setChatMessages([]);
    setShowTreeView(false); // Reset tree view when switching chats

    try {
      const response = await fetch(`http://localhost:5000/getSpecificHistory/${chatId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat content');
      }

      const data = await response.json();
      setChatMessages(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load specific chat content.');
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      const response = await fetch(`http://localhost:5000/edit/${messageId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      await response.json();
      alert('Message edited successfully');
      fetchSpecificChat(selectedChat.chatId, selectedChat.title);
    } catch (error) {
      console.error(error);
      alert('Error editing message: ' + error.message);
    }
  };

  const handleQuestionSubmit = async () => {
    if (!question.trim() || !selectedChat) return;

    setLoadingResponse(true);

    try {
      const response = await fetch('http://localhost:5000/enter', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: selectedChat.chatId,
          question,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchSpecificChat(selectedChat.chatId, selectedChat.title);
        setQuestion('');
      } else {
        alert(data.error || 'Error sending question.');
      }
    } catch (error) {
      console.error(error);
      alert('Server error');
    } finally {
      setLoadingResponse(false);
    }
  };

  const handleRegenerateAnswer = async (previousAiMessageId) => {
    if (loadingRegeneration) return;

    setLoadingRegeneration(true);

    try {
      const response = await fetch('http://localhost:5000/regenerate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ previousAiMessageId }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchSpecificChat(selectedChat.chatId, selectedChat.title);
      } else {
        alert(data.error || 'Error regenerating answer.');
      }
    } catch (error) {
      console.error(error);
      alert('Server error');
    } finally {
      setLoadingRegeneration(false);
    }
  };

  const handleRespondToAiMessage = async (previousAiMessageId) => {
    const newUserQuestion = prompt('Enter your follow-up question:');
    if (!newUserQuestion || !selectedChat) return;

    setLoadingRespond(true);

    try {
      const response = await fetch('http://localhost:5000/respond', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          previousAiMessageId,
          newUserQuestion,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchSpecificChat(selectedChat.chatId, selectedChat.title);
        alert('Response submitted successfully!');
      } else {
        alert(data.error || 'Error responding to AI message.');
      }
    } catch (error) {
      console.error(error);
      alert('Server error');
    } finally {
      setLoadingRespond(false);
    }
  };

  const renderMessages = (messages) => {
    return messages.map((msg, index) => (
      <div key={msg._id || index} className="message-item">
        <div className="message">
          <div>
            <strong>{msg.sender}:</strong> {msg.content}
          </div>
          {msg.sender === 'user' && (
            <button onClick={() => handleEditMessage(msg._id, prompt('Edit your message:', msg.content))}>
              Edit
            </button>
          )}
          {msg.sender === 'ai' && (
            <div>
              <button
                onClick={() => handleRegenerateAnswer(msg._id)}
                disabled={loadingRegeneration}
              >
                {loadingRegeneration ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={() => handleRespondToAiMessage(msg._id)}
                disabled={loadingRespond}
              >
                {loadingRespond ? 'Responding...' : 'Respond'}
              </button>
            </div>
          )}
          {msg.children && msg.children.length > 0 && renderMessages(msg.children)}
        </div>
      </div>
    ));
  };

  const renderTreeView = (messages, depth = 0) => {
    return messages.map((msg, index) => (
      <div
        key={msg._id || index}
        style={{
          marginLeft: depth * 20,
          borderLeft: '2px solid #ccc',
          paddingLeft: 10,
          marginBottom: 5,
        }}
      >
        <strong>{msg.sender}:</strong> {msg.content}
        {msg.children && msg.children.length > 0 && renderTreeView(msg.children, depth + 1)}
      </div>
    ));
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  return (
    <>
      <style>{`
        .dashboard {
          display: flex;
          height: 100vh;
          font-family: Arial, sans-serif;
        }

        .sidebar {
          width: 30%;
          border-right: 1px solid #ccc;
          padding: 20px;
          overflow-y: auto;
          background-color: #f4f4f4;
        }

        .chat-area {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .chat-item {
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          margin-bottom: 10px;
          background-color: #fff;
          cursor: pointer;
        }

        .chat-item:hover {
          background-color: #e9ecef;
        }

        .chat-title {
          font-weight: bold;
          color: #333;
        }

        .button-group {
          margin-bottom: 20px;
        }

        .logout-btn, .create-chat-btn {
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 10px;
        }

        .logout-btn {
          background-color: #dc3545;
        }

        .logout-btn:hover {
          background-color: #c82333;
        }

        .create-chat-btn {
          background-color: #007bff;
        }

        .create-chat-btn:hover {
          background-color: #0056b3;
        }

        .input-bar {
          display: flex;
          align-items: center;
          margin-top: 20px;
        }

        .input-bar input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          margin-right: 10px;
        }

        .input-bar button {
          padding: 10px 20px;
          background-color: #007bff;
          border: none;
          color: white;
          border-radius: 6px;
          cursor: pointer;
        }

        .input-bar button:disabled {
          background-color: #888;
          cursor: not-allowed;
        }

        .message {
          padding: 10px;
          background-color: #fff;
          border: 1px solid #ccc;
          border-radius: 6px;
          margin-bottom: 10px;
          max-width: 800px;
          word-wrap: break-word;
        }

        .message button {
          background-color: #28a745;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 6px;
          cursor: pointer;
          margin-left: 10px;
        }

        .message button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .message p {
          margin: 0;
          padding: 0;
        }
      `}</style>

      <div className="dashboard">
        <div className="sidebar">
          <h2>Chats</h2>
          {error ? (
            <p style={{ color: 'red' }}>{error}</p>
          ) : chatHistory.length === 0 ? (
            <p>No chat history found.</p>
          ) : (
            [...chatHistory].reverse().map(({ title, chatId }) => (
              <div
                key={chatId}
                className="chat-item"
                onClick={() => fetchSpecificChat(chatId, title)}
              >
                <div className="chat-title">{title}</div>
              </div>
            ))
          )}
        </div>

        <div className="chat-area">
          <div className="button-group">
            <button onClick={handleCreateNewChat} className="create-chat-btn">Create New Chat</button>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>

          {selectedChat ? (
            <>
              <h2>{selectedChat.title}</h2>
              <button
                onClick={() => setShowTreeView(!showTreeView)}
                style={{
                  marginBottom: 10,
                  padding: '8px 16px',
                  backgroundColor: '#17a2b8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  width: 'fit-content'
                }}
              >
                {showTreeView ? 'Hide Tree View' : 'Show Tree View'}
              </button>

              <div>{showTreeView ? renderTreeView(chatMessages) : renderMessages(chatMessages)}</div>

              <div className="input-bar">
                <input
                  type="text"
                  placeholder="Enter your question..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuestionSubmit()}
                  disabled={loadingResponse}
                />
                <button onClick={handleQuestionSubmit} disabled={loadingResponse}>
                  {loadingResponse ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <p>Select a chat from the left to view its contents.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
