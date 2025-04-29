import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userData = { username, password };

    try {
      const response = await fetch('http://localhost:5000/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();
      const token = data.token;

      if (token) {
        sessionStorage.setItem('sessionToken', token);
        window.location.href = '/dashboard'; // or use navigate('/dashboard');
      } else {
        setError('Token not received. Login failed.');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
      console.error('Error:', error);
    }
  };

  return (
    <>
      <style>{`
        body, #root {
          margin: 0;
          padding: 0;
          min-height: 100vh;
          width: 100%;
          font-family: Arial, sans-serif;
          background-color: #f0f2f5;
        }

        .signInContainer {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }

        .signInForm {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }

        .signInForm h2 {
          margin-bottom: 30px;
          color: #333;
          font-size: 24px;
        }

        .formGroup {
          margin-bottom: 20px;
          text-align: left;
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
        }

        .formGroup input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 5px rgba(0, 123, 255, 0.2);
        }

        .submitButton {
          width: 100%;
          padding: 12px;
          background-color: #007bff;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          font-size: 18px;
          cursor: pointer;
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

        .errorMessage {
          color: red;
          margin-bottom: 20px;
        }
      `}</style>

      <div className="signInContainer">
        <form onSubmit={handleSubmit} className="signInForm">
          <h2>Sign In</h2>

          {error && <div className="errorMessage">{error}</div>}

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

          <button type="submit" className="submitButton">Sign In</button>

          <button type="button" className="linkButton" onClick={() => navigate('/signup')}>
            Don't have an account? Sign Up
          </button>
        </form>
      </div>
    </>
  );
}

export default SignIn;
