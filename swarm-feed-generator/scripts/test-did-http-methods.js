const axios = require('axios');

async function testHttpMethods() {
  const endpoints = [
    'https://swarm-feed-generator.onrender.com/.well-known/did.json',
    'https://swarm-feed-generator.onrender.com/did.json'
  ];
  
  const methods = ['get', 'head', 'options'];
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}:`);
    
    for (const method of methods) {
      try {
        const response = await axios[method](endpoint);
        console.log(`  ${method.toUpperCase()}: ${response.status}`);
      } catch (error) {
        console.log(`  ${method.toUpperCase()}: ERROR - ${error.message}`);
      }
    }
  }
}

testHttpMethods(); 