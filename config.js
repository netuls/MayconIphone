// Configuração do Firebase (Console > Configurações do projeto > Seus apps > Web).
// A apiKey do Firebase para web é pública: cole o valor real (começa com "AIza...").
// NÃO inicialize o Firebase aqui — o core.js já faz isso.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBFE2gREBBHA_pne1pFh411dvxYDgPVIlo",
  authDomain: "maycon-assistencia.firebaseapp.com",
  projectId: "maycon-assistencia",
  storageBucket: "maycon-assistencia.firebasestorage.app",
  messagingSenderId: "661809158672",
  appId: "1:661809158672:web:914cc15628e09ff1ef4895"
};

// E-mail do usuário admin criado no Firebase (Authentication > Users).
// O painel pede só a senha; este e-mail é usado por trás.
const ADMIN_EMAIL = "mayconelano15@gmail.com";

// Endereço da função no Netlify que confere o código da troca de chave Pix.
// Troque pelo endereço real do projeto, sem barra no final.
const PIX_API = "https://dulcet-fairy-7f3428.netlify.app";
