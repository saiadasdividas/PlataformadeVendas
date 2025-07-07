// functions/index.js
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {beforeUserCreated} = require("firebase-functions/v2/identity");
const {onCall, HttpsError} = require("firebase-functions/v2/https");

// Inicializa o SDK do Admin
initializeApp();

// Sempre que um usuário for criado, atribui a ele a role 'USER'
exports.setUserRole = beforeUserCreated(
  {region: "us-central1"},
  async (event) => {
    const user = event.data;

    try {
      await getAuth().setCustomUserClaims(user.uid, {
        role: "USER",
      });

      await getFirestore().collection("users").doc(user.uid).set({
        email: user.email,
        displayName: user.displayName || "",
        role: "USER",
        createdAt: FieldValue.serverTimestamp(),
        isActive: true,
      });

      console.log(`Role USER atribuída ao ${user.uid}`);
    } catch (err) {
      console.error("Erro em setUserRole:", err);
      throw err;
    }
  },
);


// Função callable para promoção de usuários
exports.updateUserRole = onCall(
  {region: "us-central1"},
  async (req) => {
    const {uid, newRole} = req.data;
    const caller = req.auth && req.auth.token ? req.auth.token.role : null;

    if (caller !== "SUPER_ADMIN") {
      throw new HttpsError(
        "permission-denied",
        "Acesso negado",
      );
    }

    const validRoles = [
      "SUPER_ADMIN",
      "USER_SDR",
      "USER_VENDEDOR",
      "MR_RESPONSAVEL",
      "ADMIN_OPERACIONAL",
      "ADMIN_CONTEUDO",
      "ADMIN_GAMIFICACAO",
    ];

    if (!validRoles.includes(newRole)) {
      throw new HttpsError(
        "invalid-argument",
        "Role inválida",
      );
    }

    try {
      await getAuth().setCustomUserClaims(uid, {
        role: newRole,
      });

      await getFirestore().collection("users").doc(uid).update({
        "profile.role": newRole,
        "updatedAt": FieldValue.serverTimestamp(),
      });

      return {success: true};
    } catch (err) {
      console.error("Erro em updateUserRole:", err);
      throw new HttpsError("internal", err.message);
    }
  },
);

// Função callable para criação de usuários por administradores
exports.createUser = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (req) => {
    const callerRole = req.auth && req.auth.token ? req.auth.token.role : null;
    if (callerRole !== "SUPER_ADMIN") {
      throw new HttpsError("permission-denied", "Acesso negado");
    }

    const {email, password, displayName = "", role = "USER"} = req.data;
    const validRoles = [
      "SUPER_ADMIN",
      "USER_SDR",
      "USER_VENDEDOR",
      "MR_RESPONSAVEL",
      "ADMIN_OPERACIONAL",
      "ADMIN_CONTEUDO",
      "ADMIN_GAMIFICACAO",
      "USER",
    ];
    if (!validRoles.includes(role)) {
      throw new HttpsError("invalid-argument", "Role inválida");
    }

    try {
      const user = await getAuth().createUser({email, password, displayName});
      await getAuth().setCustomUserClaims(user.uid, {role});
      await getFirestore().collection("users").doc(user.uid).set({
        email,
        displayName,
        role,
        createdAt: FieldValue.serverTimestamp(),
        isActive: true,
      });
      return {uid: user.uid};
    } catch (err) {
      console.error("Erro em createUser:", err);
      throw new HttpsError("internal", err.message);
    }
  },
);
