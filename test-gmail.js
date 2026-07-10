import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('🔍 Verificando credenciales de Gmail...\n');

const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_PASSWORD;

console.log('Email:', gmailUser);
console.log('Contraseña:', gmailPassword?.length ? `${gmailPassword.length} caracteres` : 'NO CONFIGURADA');

if (!gmailUser || !gmailPassword) {
  console.log('\n❌ Falta GMAIL_USER o GMAIL_PASSWORD en .env.local');
  process.exit(1);
}

if (gmailPassword.length !== 16) {
  console.log(`\n⚠️  La contraseña tiene ${gmailPassword.length} caracteres, debería tener 16`);
  console.log('Debes regenerarla en: https://myaccount.google.com/apppasswords');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPassword,
  },
});

console.log('\n⏳ Intentando conectar a Gmail...');

transporter.verify()
  .then(() => {
    console.log('✅ ¡Conexión exitosa! Tu contraseña es correcta.');
    console.log('Ahora puedes usar "npm run dev" y probar el botón de exportar.');
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ Error de autenticación:', error.message);
    console.log('\nPosibles soluciones:');
    console.log('1. Verifica que sea una contraseña de APLICACIÓN (16 caracteres)');
    console.log('2. No uses tu contraseña normal de Gmail');
    console.log('3. Regenera en: https://myaccount.google.com/apppasswords');
    console.log('4. Copia la contraseña SIN guiones ni espacios');
    console.log('5. Actualiza .env.local y reinicia el servidor');
    process.exit(1);
  });
