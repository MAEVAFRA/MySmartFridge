// Util d'envoi d'emails.
// En dev (aucun SMTP configuré), on logge le contenu dans la console au lieu
// d'envoyer un vrai email. En prod, brancher ici un transport SMTP réel
// (ex. nodemailer + variables d'env SMTP_HOST/SMTP_USER/...).

/**
 * "Envoie" l'email de réinitialisation de mot de passe.
 * @param {string} to       Email du destinataire
 * @param {string} resetUrl Lien de réinitialisation (valable 1h)
 * @returns {Promise<{ delivered: boolean }>}
 */
exports.sendPasswordResetEmail = async (to, resetUrl) => {
  const subject = 'Réinitialisation de votre mot de passe MySmartFridge';
  const body =
    `Bonjour,\n\n` +
    `Vous avez demandé à réinitialiser votre mot de passe.\n` +
    `Cliquez sur le lien suivant (valable 1 heure) pour en choisir un nouveau :\n\n` +
    `${resetUrl}\n\n` +
    `Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.`;

  // TODO prod : remplacer ce log par un vrai envoi SMTP.
  console.log('\n──────── 📧 EMAIL (dev, non envoyé) ────────');
  console.log(`À      : ${to}`);
  console.log(`Sujet  : ${subject}`);
  console.log(body);
  console.log('────────────────────────────────────────────\n');

  return { delivered: true };
};
