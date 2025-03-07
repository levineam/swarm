// Using dynamic import for node-fetch
async function checkDidDocument() {
  const fetch = (await import('node-fetch')).default
  const did = 'did:plc:ouadmsyvsfcpkxg3yyz4trqi'
  const response = await fetch(`https://plc.directory/${did}`)
  const document = await response.json()
  console.log(JSON.stringify(document, null, 2))
}

checkDidDocument().catch(console.error)
