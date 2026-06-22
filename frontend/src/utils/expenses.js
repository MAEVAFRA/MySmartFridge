// Catégories de dépenses proposées dans les formulaires (dépenses + budgets).
export const EXPENSE_CATEGORIES = ['Alimentation', 'Maison', 'Hygiène', 'Transport', 'Loisirs', 'Santé', 'Autre']

export const PAYMENT_METHODS = ['Carte', 'Espèces', 'Virement', 'Autre']

// Formate un montant en euros (locale fr-FR).
export const euro = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)
