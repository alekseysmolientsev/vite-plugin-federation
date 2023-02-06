import React from 'react';
import reactLogo from './assets/react.svg';
import './App.css'


import Header from 'nav/Header';
// const Header = React.lazy(() => import('nav/Header'))
// import Button from './button1';

function App() {

  return (
    <div className="App">
      <div>
        <Header />
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>        
      </div>
      <h1>React + Esbuild</h1>      
    </div>
  )
}

export default App
