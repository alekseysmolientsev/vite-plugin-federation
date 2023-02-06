import React from 'react';
import reactLogo from './assets/react.svg';
import './App.css'


import Button from 'nav/RemoteApp';

function App() {

  return (
    <div className="App">
      <div>
        <Button />
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>        
      </div>
      <h1>React + Esbuild</h1>      
    </div>
  )
}

export default App
