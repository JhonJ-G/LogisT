// Configuración de Firebase (reemplaza con tus credenciales reales)
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    databaseURL: "https://tamales-3008a-default-rtdb.firebaseio.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_STORAGE_BUCKET",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
