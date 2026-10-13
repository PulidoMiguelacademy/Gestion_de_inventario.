# 📱 TecnoStock Web - Sistema de Gestión de Inventario

<div align="center">

![TecnoStock Logo](https://img.shields.io/badge/TecnoStock-Inventario%20Web-blue?style=for-the-badge&logo=appveyor)

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Plataforma Fullstack para la administración de inventario, ventas, auditoría (Kardex), proveedores y analítica financiera en tiempo real para tiendas de tecnología.**

[Características](#-características-principales) •
[Arquitectura](#-arquitectura-del-sistema) •
[Instalación](#-instalación-y-puesta-en-marcha) •
[API Docs](#-documentación-de-la-api) •
[Roles & Accesos](#-roles-y-permisos)

</div>

---

## 📌 Descripción del Proyecto

**TecnoStock Web** es una solución integral desarrollada para optimizar la cadena de suministro y punto de venta de comercializadoras de productos tecnológicos (celulares, accesorios y periféricos). El sistema integra una interfaz moderna y reactiva construida en **React 19** con un microservicio de analítica y reportes financieros desarrollado en **Python FastAPI**, sincronizados en tiempo real mediante **Google Cloud Firestore**.

---

## ✨ Características Principales

### 🔐 1. Autenticación y Control de Roles (RBAC)
* **Seguridad integral con Firebase Auth:** Inicio de sesión cifrado, cierre de sesión y flujo automatizado para recuperar/restablecer contraseña por correo electrónico.
* **Separación estricta de privilegios:**
  * **Administrador:** Control total del catálogo (crear, editar, eliminar productos), activación/desactivación de colaboradores y reportes globales.
  * **Operador (Empleado):** Consulta de stock, registro de ventas y visualización de catálogo protegida contra ediciones no autorizadas.
* **Panel de Colaboradores:** Módulo administrativo en tiempo real para gestionar el estado y rol de cada empleado.

### 📦 2. Catálogo y Existencias en Tiempo Real
* **Formateo numérico local:** Soporte nativo para moneda colombiana (COP) con separadores de miles y puntos (ej. `$650.000`, `$1.200.000`).
* **Soporte para productos serializados:** Identificación por código de barras, marca, modelo y control individual de seriales IMEI/serie.
* **Semáforo inteligente de existencias:** Clasificación visual automática (`OK`, `BAJO STOCK`, `AGOTADO`) según el stock mínimo configurado.

### 🛒 3. Registro de Ventas y Descuento de Stock
* **Modal de venta rápida:** Descuento atómico del stock disponible en Firestore.
* **Trazabilidad de ventas:** Historial de transacciones con fecha, cliente, unidades y valor total.
* **Kardex de Movimientos:** Auditoría cronológica de entradas y salidas de mercancía.

### 🚚 4. Directorio de Proveedores
* Registro y consulta de distribuidores mayoristas oficiales (NIT, razón social, teléfonos y correos para pedidos y garantías).

### 📈 5. Microservicio Financiero & Reportes (Python)
* Cálculo dinámico del **valor contable del inventario** a costo de adquisición.
* Proyección de valor de venta y estimación de margen de ganancia porcentual.
* Endpoint de **Cierre Diario de Ventas** que consolida las métricas del día en Firestore.

### 🛡️ 6. Resiliencia & Tolerancia a Fallos
* **React ErrorBoundary:** Protección global que previene pantallas en blanco ante inconsistencias de renderizado.
* **Directivas Anti-Traducción:** Blindaje en el DOM contra extensiones del navegador que alteren la reconciliación de componentes.

---

## 🏛️ Arquitectura del Sistema

```
                   ┌────────────────────────────────────────┐
                   │           CLIENTE WEB (REACT)          │
                   │    React 19 • Vite • Lucide Icons     │
                   └───────┬────────────────────────┬───────┘
                           │                        │
       Sincronización      │                        │  Peticiones HTTP
       en Tiempo Real      ▼                        ▼  (Reportes & Cierre)
┌──────────────────────────────────────┐  ┌──────────────────────────────────┐
│      GOOGLE FIREBASE (CLOUD)         │  │     BACKEND PYTHON (FASTAPI)     │
│  • Firebase Authentication (Cifrado) │  │  • FastAPI + Uvicorn             │
│  • Cloud Firestore (9 Colecciones)   │  │  • Pandas (Analítica Financiera) │
│    - usuarios, productos, ventas,    │  │  • Swagger OpenAPI Documentación │
│      proveedores, movimientos...     │  └──────────────────────────────────┘
└──────────────────────────────────────┘
```

---

## 📂 Estructura del Repositorio

```bash
Gestion_de_inventario/
├── backend/                  # Microservicio API en Python
│   ├── main.py               # Endpoints FastAPI y lógica analítica
│   └── requirements.txt      # Dependencias Python
├── frontend/                 # Aplicación Web React
│   ├── src/
│   │   ├── components/       # Navbar, Sidebar, ErrorBoundary
│   │   ├── context/          # AuthContext (Estado global de sesión)
│   │   ├── firebase/         # Configuración y conexión con Firebase
│   │   ├── pages/            # Login, Dashboard, Products, Suppliers, Reports, Users
│   │   ├── App.jsx           # Enrutamiento y control de vistas
│   │   └── main.jsx          # Punto de entrada de React
│   ├── index.html            # Plantilla HTML5 con directivas de idioma
│   ├── package.json          # Dependencias Node.js
│   └── vite.config.js        # Configuración de Vite
├── docs/                     # Documentación técnica, evidencias y cronograma
│   ├── CronogramaApp Inventario.xlsx
│   ├── Evidencias del avance del proyecto.pdf
│   └── Evidencias del avance del proyecto.docx
├── iniciar_proyecto.bat      # Script de lanzamiento con un solo clic (Windows)
├── .gitignore                # Reglas de exclusión de Git
└── README.md                 # Documentación principal del proyecto
```

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
* [Node.js](https://nodejs.org/) (Versión 18 o superior)
* [Python](https://www.python.org/) (Versión 3.10 o superior)
* [Git](https://git-scm.com/)

---

### Opción 1: Inicio Rápido con 1 Clic (Recomendado en Windows)
En la carpeta raíz del proyecto, simplemente haz doble clic en:
```bat
iniciar_proyecto.bat
```
Este script se encargará de levantar automáticamente el servidor de Python en el puerto `8000` y el cliente de React en el puerto `5173`.

---

### Opción 2: Inicio Manual desde Terminal

#### 1. Configurar y levantar el Backend (Python):
```bash
# Entrar a la carpeta del backend
cd backend

# (Opcional) Crear y activar entorno virtual
python -m venv venv
# En Windows:
venv\Scripts\activate
# En Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor FastAPI
python -m uvicorn main:app --reload --port 8000
```
> El servicio quedará disponible en: `http://localhost:8000`

#### 2. Configurar y levantar el Frontend (React):
En una nueva terminal:
```bash
# Entrar a la carpeta del frontend
cd frontend

# Instalar paquetes
npm install

# Iniciar entorno de desarrollo
npm run dev
```
> La aplicación estará disponible en: `http://localhost:5173`

---

## 📖 Documentación de la API

FastAPI genera automáticamente la documentación interactiva OpenAPI:
* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Redoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Endpoints Principales:
* `GET /api/health` - Estado de salud del microservicio.
* `GET /api/reports/valuation` - Valoración económica de existencias, margen promedio y capital proyectado.
* `POST /api/reports/daily-close` - Cierre formal de caja y ventas del día con persistencia en Firestore.

---

## 👤 Roles y Permisos

| Módulo / Funcionalidad | Administrador | Operador (Empleado) |
|---|:---:|:---:|
| Ver Panel General (*Dashboard*) | ✅ | ✅ |
| Consultar Catálogo y Existencias | ✅ | ✅ |
| Registrar Nueva Venta | ✅ | ✅ |
| Crear Nuevo Producto | ✅ | ❌ |
| Editar Precios / Datos de Producto | ✅ | ❌ |
| Eliminar Producto | ✅ | ❌ |
| Registrar / Ver Proveedores | ✅ | ✅ |
| Cierre Diario y Reportes Financieros | ✅ | ✅ |
| Gestión de Colaboradores (Roles/Activar) | ✅ | ❌ |

### Cuentas de Acceso de Prueba:
* **Administrador:** `admin@tiendatecno.com` | Contraseña: `Admin12345*`
* **Operador:** Puede registrarse desde el formulario de registro de la aplicación (se le asigna rol `operador` por defecto).

---

## 📊 Estado del Proyecto & Metodología

El desarrollo sigue la metodología **Scrum** con seguimiento en **GitHub Projects**:
* **Épica 0 (Inicio de sesión y usuarios):** ✅ 100% Completada.
* **Épica 1 (Gestión de productos y catálogo):** ✅ 100% Completada.
* **Épica 2 (Control de inventario y stock actual):** 🔄 En curso (Completada consulta de stock, en planificación entrada de mercancía).
* **Épica 3 (Gestión de ventas y Kardex):** 🔄 Funcionalidad base implementada.
* **Épica 6 (Reportes y Cierre diario):** ✅ Integrado con microservicio en Python.

---

## 👨‍💻 Autores

* **John Alejandro Morales Lopez** - [@AlejandroM55](https://github.com/johnmoraleslo)
* **Miguel Ángel Pulido Bustamante** - [@PulidoMiguelacademy](https://github.com/PulidoMiguelacademy)

---

## 📄 Licencia

Este proyecto se encuentra bajo la Licencia [MIT](LICENSE).
