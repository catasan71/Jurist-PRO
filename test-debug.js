const req = require('http').request('http://localhost:3000/api/debug-key', {
  headers: { Accept: 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('DEBUG KEY HTTP', res.statusCode, ':', data));
});
req.end();
