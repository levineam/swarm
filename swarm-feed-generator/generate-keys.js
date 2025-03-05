const crypto = require('crypto')
const keyPair = crypto.generateKeyPairSync('ed25519')
console.log(
  'Public Key:',
  keyPair.publicKey.export({type: 'spki', format: 'pem'}),
)
console.log(
  'Private Key:',
  keyPair.privateKey.export({type: 'pkcs8', format: 'pem'}),
)
