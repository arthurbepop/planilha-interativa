import type { FirebaseOptions } from 'firebase/app'

/**
 * Configuração do projeto Firebase (Console → Configurações do projeto → Seus apps → Web).
 * Esses valores são públicos por natureza: a segurança vem do login e das regras
 * em `firestore.rules`. Enquanto for `null`, o app funciona só no aparelho.
 */
export const firebaseConfig: FirebaseOptions | null = null
