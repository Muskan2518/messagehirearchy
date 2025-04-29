import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post('http://localhost:5000/signup', {
        username,
        password,
      });

      setMessage('✅ Signup successful! You can now sign in.');
      setUsername('');
      setPassword('');
    } catch (err) {
      setMessage(`❌ Signup failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const goToSignIn = () => {
    navigate('/signin');
  };

  return (
    <>
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          font-family: Arial, sans-serif;
          background-color: #f0f2f5;
        }

        .signupContainer {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100%;
        }

        .signupForm {
          background: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
          text-align: center;
        }

        .signupForm h2 {
          margin-bottom: 30px;
          color: #333;
        }

        .formGroup {
          text-align: left;
          margin-bottom: 20px;
        }

        .formGroup label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          color: #555;
        }

        .formGroup input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
          box-sizing: border-box;
        }

        .formGroup input:focus {
          border-color: #007bff;
          outline: none;
          box-shadow: 0 0 5px rgba(0, 123, 255, 0.2);
        }

        .submitButton {
          width: 100%;
          padding: 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 18px;
          cursor: pointer;
          margin-top: 10px;
        }

        .submitButton:hover {
          background-color: #0056b3;
        }

        .linkButton {
          margin-top: 20px;
          background: none;
          border: none;
          color: #007bff;
          font-size: 16px;
          cursor: pointer;
          text-decoration: underline;
        }

        .linkButton:hover {
          color: #0056b3;
        }

        .message {
          margin-top: 20px;
          font-weight: bold;
          color: #333;
        }
      `}</style>

      <div className="signupContainer">
        <form className="signupForm" onSubmit={handleSubmit}>
          <h2>Sign Up</h2>
          <div className="formGroup">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="formGroup">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="submitButton" type="submit">Sign Up</button>
          <button className="linkButton" type="button" onClick={goToSignIn}>
            Already have an account? Sign In
          </button>
          {message && <div className="message">{message}</div>}
        </form>
      </div>
    </>
  );
}

export default Signup;
