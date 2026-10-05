/**
 * CONFIGURAÇÃO — edite só este arquivo com os seus próprios dados.
 * (Veja o README.md para o passo a passo de onde conseguir cada valor.)
 */
self.APP_CONFIG = {
  // Client ID gerado no Google Cloud Console (Credenciais → OAuth Client ID → Web application).
  GOOGLE_CLIENT_ID: '575499197045-5nudmf8u156dg6r4g02vqjj37t13t4is.apps.googleusercontent.com',

  // URL de implantação do seu Apps Script, terminando em /exec.
  // (Extensões → Apps Script → Implantar → Gerenciar implantações → copiar a URL do "App da Web")
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwWvgHk78feB4e3Msj47NzLTGkZnprATdl9JHsrakLf-pJBT7Fz3D9X9PjrjECfSdKT/exec',

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
