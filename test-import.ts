import neonDb from './api/_lib/neon-database';

console.log('neonDb imported successfully:', typeof neonDb);
console.log('neonDb methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(neonDb)));