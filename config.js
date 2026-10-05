/**
 * CONFIGURAÇÃO — edite só este arquivo com os seus próprios dados.
 * (Veja o README.md para o passo a passo de onde conseguir cada valor.)
 */
self.APP_CONFIG = {
  // Client ID gerado no Google Cloud Console (Credenciais → OAuth Client ID → Web application).
  GOOGLE_CLIENT_ID: 'COLE_AQUI_SEU_CLIENT_ID.apps.googleusercontent.com',

  // URL de implantação do seu Apps Script, terminando em /exec.
  // (Extensões → Apps Script → Implantar → Gerenciar implantações → copiar a URL do "App da Web")
  APPS_SCRIPT_URL: 'COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT/exec',

  // Configuração do Firebase (Console do Firebase → Configurações do projeto →
  // Seus apps → app da Web → "Configuração do SDK").
  FIREBASE_CONFIG: {
    apiKey: 'COLE_AQUI',
    authDomain: 'COLE_AQUI.firebaseapp.com',
    projectId: 'COLE_AQUI',
    messagingSenderId: 'COLE_AQUI',
    appId: 'COLE_AQUI'
  },

  // Console do Firebase → Configurações do projeto → Cloud Messaging →
  // Certificados push da Web → gerar par de chaves (chave pública).
  FIREBASE_VAPID_KEY: 'COLE_AQUI_A_CHAVE_VAPID_PUBLICA'
};
