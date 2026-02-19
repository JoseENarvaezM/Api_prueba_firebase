// Ejemplo de backend Node.js/Express para recibir el Bearer Token

import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Inicializar Firebase Admin SDK
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware para verificar el token de Firebase
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Token no proporcionado' 
      });
    }

    // Extraer el token
    const token = authHeader.split('Bearer ')[1];
    
    // Verificar el token con Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Agregar información del usuario al request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      emailVerified: decodedToken.email_verified
    };
    
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(401).json({ 
      error: 'Token inválido',
      message: error.message 
    });
  }
}

// Rutas públicas (sin autenticación)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API funcionando correctamente' });
});

// Rutas protegidas (requieren autenticación)
app.get('/api/user/profile', verifyFirebaseToken, async (req, res) => {
  try {
    // Aquí puedes acceder a req.user con la información del usuario
    const userData = {
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name,
      emailVerified: req.user.emailVerified,
      message: '¡Perfil obtenido exitosamente con Bearer Token!'
    };
    
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

app.post('/api/user/update', verifyFirebaseToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    // Actualizar datos del usuario en tu base de datos
    // usando req.user.uid como identificador
    
    res.json({ 
      message: 'Usuario actualizado',
      uid: req.user.uid,
      updatedData: { name, phone }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

app.get('/api/protected-data', verifyFirebaseToken, async (req, res) => {
  try {
    // Ejemplo de datos protegidos
    const data = {
      message: 'Estos son datos protegidos',
      user: req.user.email,
      timestamp: new Date(),
      sensitiveData: 'Solo usuarios autenticados pueden ver esto'
    };
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api`);
});

