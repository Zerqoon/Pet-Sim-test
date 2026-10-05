// These are machine-generated 144-bit login secrets, not human-chosen passwords.
// A keyed verifier avoids a costly password KDF in the Free plan's CPU budget.
// AUTH_PEPPER is an independent 256-bit server secret and never reaches clients.
export async function passwordHash(password,salt,pepper) {
  if(!/^[a-f0-9]{64}$/.test(pepper || '')) throw new Error('AUTH_PEPPER is not configured.');
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',Uint8Array.from(pepper.match(/../g),x=>parseInt(x,16)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,encoder.encode('PetUniverseAdmin-v2\0'+salt+'\0'+password));
  return [...new Uint8Array(signature)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
