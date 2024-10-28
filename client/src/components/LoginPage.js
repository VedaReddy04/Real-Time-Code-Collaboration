import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function App() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleGenerateRoomId = () => {
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied to clipboard!");
  };

  const handleJoin = () => {
    if (roomId && username) {
      navigate(`/editor/${roomId}`, { state: { username } });
    } else {
      alert("Please enter both Room ID and Username.");
    }
  };

  return (
    <div className="container">
      <div className="login-box">
        <div className="logo">
          <h1>Collaborate & Code</h1>
        </div>
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room ID"
          className="input-field"
        />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="input-field"
        />
        <button onClick={handleJoin} className="join-button">Join</button>
        <button onClick={copyRoomId} className="copy-button">Copy Room ID</button>
        <p className="generate-room" onClick={handleGenerateRoomId}>
          Generate Unique Room ID
        </p>
      </div>
    </div>
  );
}

export default App;
