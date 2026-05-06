const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'api.figma.com',
  path: '/v1/files/w8xqmp1WTAh7gMG42KLvlL/nodes?ids=97:2',
  method: 'GET',
  headers: {
    'X-Figma-Token': 'REPLACED_TOKEN_k5BiXPoUihjA6ZwHaIp'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('figma_out.json', data);
    console.log('Done writing');
  });
}).on('error', console.error);
