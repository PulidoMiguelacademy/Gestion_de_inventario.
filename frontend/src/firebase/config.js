import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración obtenida del proyecto en Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDO2d7UY78GW-t9hCE5ct5oAZ8H5GCuALU",
  authDomain: "tienda-tecnologia-inventario.firebaseapp.com",
  projectId: "tienda-tecnologia-inventario",
  storageBucket: "tienda-tecnologia-inventario.firebasestorage.app",
  messagingSenderId: "861047046970",
  appId: "1:861047046970:web:tiendatecno"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar instancias de Auth y Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
