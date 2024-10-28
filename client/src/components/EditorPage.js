import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Editor } from '@monaco-editor/react';
import io from 'socket.io-client';
import Avatar from 'react-avatar';
import './EditorPage.css';

const socket = io('http://localhost:5000');

function EditorPage() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [language, setLanguage] = useState('java');
    const [users, setUsers] = useState([]);
    const [username, setUsername] = useState('');

    useEffect(() => {
        const { username } = location.state || {};
        setUsername(username);
        socket.emit('joinRoom', { roomId, username });
        socket.on('userJoinedMessage', (message) => alert(message));

        // Listen for user list updates
        socket.on('updateUserList', (data) => setUsers(data.users));

        // Listen for code and language updates from the server
        socket.on('codeUpdate', (newCode) => setCode(newCode));
        socket.on('languageUpdate', (newLanguage) => setLanguage(newLanguage));
        socket.on('outputUpdate', (newOutput) => setOutput(newOutput));
        socket.on('userLeftMessage', (message) => alert(message));


        // Clean up listeners on unmount
        return () => {
            socket.off('updateUserList');
            socket.off('userJoinedMessage');
            socket.off('codeUpdate');
            socket.off('languageUpdate');
            socket.off('outputUpdate');
            socket.off('userLeftMessage');
            socket.emit('leaveRoom', roomId);
        };
    }, [roomId, location.state]);

    const handleCodeChange = (value) => {
        setCode(value);
        socket.emit('codeChange', { roomId, code: value });
    };

    const handleLanguageChange = (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        socket.emit('languageChange', { roomId, language: lang });
    };

    const runCode = async () => {
        try {
            const response = await fetch('http://localhost:5000/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language, roomId }),
            });
            const data = await response.json();
            setOutput(data.output || 'No output returned');
        } catch (error) {
            setOutput(`Error: ${error.message}`);
        }
    };

    const handleLeaveRoom = () => {
        socket.emit('leaveRoom', { roomId, username }); 
        navigate('/'); 
    };

    return (
        <div className="editor-container">
            <div className="sidebar">
                <h3>Users</h3>
                <hr className="divider" />
                <ul>
                    {users.map((user, index) => (
                        <li key={index} className="user-item">
                            <Avatar name={user} size="40" round={true} />
                            <span className="username">{user}</span>
                        </li>
                    ))}
                </ul>
                <button className="leave-room-button" onClick={handleLeaveRoom}>
                    Leave Room
                </button>
            </div>
            <div className="editor">
                <select value={language} onChange={handleLanguageChange}>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="python3">Python</option>
                    <option value="c">C</option>
                </select>
                <Editor
                    height="400px"
                    language={language}
                    value={code}
                    onChange={handleCodeChange}
                    options={{ selectOnLineNumbers: true, automaticLayout: true }}
                />
                <button onClick={runCode}>Run Code</button>
                <div className="output">
                    <h3>Output :</h3>
                    <pre>{output}</pre>
                </div>
            </div>
        </div>
    );
}

export default EditorPage;
