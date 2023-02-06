import React from 'react'

import Button from "remote_app/RemoteApp";
const Button1 = React.lazy(() => import("./button1.jsx"));

const App = () => {
  return <div>
    <h1>Rollup Host</h1>
    <Button/>
    <Button1/>
  </div>
}
export default App
