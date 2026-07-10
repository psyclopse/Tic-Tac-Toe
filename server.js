import('./server/dist/index.js').catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});
