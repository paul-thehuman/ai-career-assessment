import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Assuming App.js is in the same directory

// Create a root and render the App component
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
