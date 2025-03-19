const axios = require('axios');

async function auditDidDocuments() {
  const endpoints = [
    'https://swarm-feed-generator.onrender.com/.well-known/did.json',
    'https://swarm-feed-generator.onrender.com/did.json'
  ];
  
  let referenceDocument = null;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint);
      console.log(`${endpoint}:`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Headers: ${JSON.stringify(response.headers, null, 2)}`);
      
      // Store first response as reference
      if (!referenceDocument) {
        referenceDocument = response.data;
        console.log(`  Content: ${JSON.stringify(response.data, null, 2)}`);
      } else {
        // Compare with reference
        const isIdentical = JSON.stringify(response.data) === JSON.stringify(referenceDocument);
        console.log(`  Identical to reference: ${isIdentical}`);
        if (!isIdentical) {
          console.log(`  Content: ${JSON.stringify(response.data, null, 2)}`);
        }
      }
    } catch (error) {
      console.log(`${endpoint}:`);
      console.log(`  Error: ${error.message}`);
    }
  }
}

auditDidDocuments(); 