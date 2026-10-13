import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "usuarios", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.activo === false) {
              await signOut(auth);
              setUser(null);
              setProfile(null);
              setAuthError("Tu cuenta ha sido desactivada por el administrador.");
            } else {
              setProfile({
                uid: currentUser.uid,
                nombre: data.nombre || currentUser.displayName || "Colaborador",
                correo: data.correo || currentUser.email || "",
                rol: data.rol || "operador",
                activo: data.activo !== false,
                ...data
              });
              setAuthError(null);
            }
          } else {
            // Usuario en Auth pero sin doc en Firestore: autogenerar perfil de operador
            const newProfile = {
              uid: currentUser.uid,
              nombre: currentUser.displayName || currentUser.email?.split("@")[0] || "Colaborador",
              correo: currentUser.email || "",
              rol: "operador",
              activo: true,
              fechaCreacion: serverTimestamp(),
              ultimoAcceso: serverTimestamp()
            };
            try {
              await setDoc(doc(db, "usuarios", currentUser.uid), newProfile);
            } catch (errDoc) {
              console.warn("Aviso: No se pudo escribir perfil en Firestore:", errDoc);
            }
            setProfile(newProfile);
            setAuthError(null);
          }
        } catch (err) {
          console.error("Error cargando perfil:", err);
          // Fallback resiliente en memoria para que no quede la pantalla en blanco
          setProfile({
            uid: currentUser.uid,
            nombre: currentUser.displayName || currentUser.email?.split("@")[0] || "Colaborador",
            correo: currentUser.email || "",
            rol: "operador",
            activo: true
          });
          setAuthError(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Validar si está activo en Firestore
      try {
        const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.activo === false) {
            await signOut(auth);
            throw new Error("Tu cuenta ha sido desactivada por el administrador.");
          }
          setProfile({
            uid: cred.user.uid,
            nombre: data.nombre || cred.user.displayName || "Colaborador",
            correo: data.correo || cred.user.email || "",
            rol: data.rol || "operador",
            activo: data.activo !== false,
            ...data
          });
        } else {
          const fallbackData = {
            uid: cred.user.uid,
            nombre: cred.user.displayName || cred.user.email?.split("@")[0] || "Colaborador",
            correo: cred.user.email || "",
            rol: "operador",
            activo: true,
            fechaCreacion: serverTimestamp(),
            ultimoAcceso: serverTimestamp()
          };
          await setDoc(doc(db, "usuarios", cred.user.uid), fallbackData);
          setProfile(fallbackData);
        }
      } catch (errDoc) {
        if (errDoc.message?.includes("desactivada")) throw errDoc;
        console.warn("Aviso de perfil en login:", errDoc);
      }
      return { success: true };
    } catch (err) {
      let msg = "Error al iniciar sesión.";
      if (err.message.includes("invalid-credential") || err.message.includes("wrong-password") || err.message.includes("user-not-found") || err.message.includes("invalid-email")) {
        msg = "Correo electrónico o contraseña incorrectos.";
      } else if (err.message.includes("desactivada")) {
        msg = err.message;
      }
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (name, email, password) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const newUserData = {
        uid: cred.user.uid,
        nombre: name.trim(),
        correo: email.trim().toLowerCase(),
        rol: "operador", // Por seguridad todo nuevo registro es operador
        activo: true,
        fechaCreacion: serverTimestamp(),
        ultimoAcceso: serverTimestamp()
      };
      await setDoc(doc(db, "usuarios", cred.user.uid), newUserData);
      setProfile(newUserData);
      return { success: true };
    } catch (err) {
      let msg = "Error al registrar la cuenta.";
      if (err.message.includes("email-already-in-use")) {
        msg = "Este correo electrónico ya se encuentra registrado.";
      } else if (err.message.includes("weak-password")) {
        msg = "La contraseña debe tener mínimo 6 caracteres.";
      }
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const resetPassword = async (email) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err) {
      let msg = "Error al enviar el correo de recuperación.";
      if (err.message.includes("user-not-found")) {
        msg = "No existe ninguna cuenta registrada con este correo.";
      } else if (err.message.includes("invalid-email")) {
        msg = "Ingresa un correo electrónico válido.";
      } else if (err.message.includes("too-many-requests")) {
        msg = "Demasiados intentos. Espera unos momentos antes de reintentar.";
      }
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setAuthError(null);
  };

  const isAdmin = profile?.rol === "admin";
  const isOperador = profile?.rol === "operador";

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isAdmin, 
      isOperador, 
      loading, 
      authError, 
      login, 
      register, 
      resetPassword,
      logout,
      clearError: () => setAuthError(null)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
