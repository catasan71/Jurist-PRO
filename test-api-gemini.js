const req = require('http').request('http://localhost:3000/api/gemini', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('RESPONSE:', data));
});
req.write(JSON.stringify({contents:[{role:'user',parts:[{text:'hello'}]}]}));
req.end();
req.on('error', console.error);
