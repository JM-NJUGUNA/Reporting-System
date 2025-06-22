import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only initialize socket if we're in a browser environment
    if (typeof window !== 'undefined') {
      try {
        // Initialize socket connection
        const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
          transports: ['websocket', 'polling'],
          autoConnect: false,
          timeout: 5000,
        });

        // Socket event listeners
        newSocket.on('connect', () => {
          console.log('Socket connected');
          setConnected(true);
          setError(null);
        });

        newSocket.on('disconnect', () => {
          console.log('Socket disconnected');
          setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setConnected(false);
          setError(error.message);
        });

        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
          if (newSocket) {
            newSocket.disconnect();
          }
        };
      } catch (err) {
        console.error('Error initializing socket:', err);
        setError(err.message);
      }
    }
  }, []);

  const connect = () => {
    if (socket && !connected) {
      try {
        socket.connect();
      } catch (err) {
        console.error('Error connecting socket:', err);
        setError(err.message);
      }
    }
  };

  const disconnect = () => {
    if (socket && connected) {
      try {
        socket.disconnect();
      } catch (err) {
        console.error('Error disconnecting socket:', err);
      }
    }
  };

  const emit = (event, data) => {
    if (socket && connected) {
      try {
        socket.emit(event, data);
      } catch (err) {
        console.error('Error emitting socket event:', err);
      }
    }
  };

  const on = (event, callback) => {
    if (socket) {
      try {
        socket.on(event, callback);
      } catch (err) {
        console.error('Error adding socket listener:', err);
      }
    }
  };

  const off = (event) => {
    if (socket) {
      try {
        socket.off(event);
      } catch (err) {
        console.error('Error removing socket listener:', err);
      }
    }
  };

  const value = {
    socket,
    connected,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
