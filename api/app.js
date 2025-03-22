const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { MongoClient } = require('mongodb');

require('dotenv').config();
const middlewares = require('./middlewares');

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

const url = process.env.MONGO_URI;
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let coleccion;

// Función para conectarse a la base de datos y asignar la colección
async function connectToDB() {
  try {
    await client.connect();
    const db = client.db('despliegue_docker');
    coleccion = db.collection('users');
    console.log("Conectado a MongoDB Atlas");
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
  }
}

// Conecta a la base de datos al iniciar la aplicación
connectToDB();

// Middleware para verificar que la conexión a la DB esté lista
app.use((req, res, next) => {
  if (!coleccion) {
    return res.status(503).json({ error: "Base de datos no conectada. Intenta nuevamente en unos instantes." });
  }
  next();
});

// Rutas
app.get("/", async (req, res) => {
  res.json([{ message: "on" }]);
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await coleccion.find().toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

app.get("/api/users/:name", async (req, res) => {
  const userId = req.params.name;
  try {
    const user = await coleccion.findOne({ name: userId });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el usuario" });
  }
});

app.post('/api/users', async (req, res) => {
  const { id, nombre, apellido, telefono } = req.body;
  try {
    await coleccion.insertOne({ id, nombre, apellido, telefono });
    res.status(201).json({ message: 'Usuario añadido exitosamente.', user: { id, nombre, apellido, telefono } });
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir el usuario' });
  }
});

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

module.exports = app;
