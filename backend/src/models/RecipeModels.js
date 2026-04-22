const { DataTypes } = require('sequelize');

module.exports.Recipe = (sequelize) => {
  return sequelize.define('Recipe', {
    id:                   { type: DataTypes.STRING(100), primaryKey: true },
    source:               { type: DataTypes.STRING(50), defaultValue: 'custom' },
    external_id:          { type: DataTypes.STRING(100) },
    title:                { type: DataTypes.STRING(300), allowNull: false },
    description:          { type: DataTypes.TEXT },
    image_url:            { type: DataTypes.TEXT },
    thumbnail_url:        { type: DataTypes.TEXT },
    ready_in_minutes:     { type: DataTypes.INTEGER },
    prep_time_minutes:    { type: DataTypes.INTEGER },
    cook_time_minutes:    { type: DataTypes.INTEGER },
    servings:             { type: DataTypes.INTEGER, defaultValue: 4 },
    difficulty:           { type: DataTypes.STRING(20), defaultValue: 'facile' },
    diet_tags:            { type: DataTypes.STRING(300) },
    allergens:            { type: DataTypes.STRING(300) },
    cuisine:              { type: DataTypes.STRING(100) },
    calories_per_serving: { type: DataTypes.FLOAT },
    instructions:         { type: DataTypes.TEXT },
    is_custom:            { type: DataTypes.BOOLEAN, defaultValue: false },
    created_by:           { type: DataTypes.INTEGER },
    household_id:         { type: DataTypes.INTEGER },
  }, {
    tableName: 'recipes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
};

module.exports.RecipeIngredient = (sequelize) => {
  return sequelize.define('RecipeIngredient', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    recipe_id:     { type: DataTypes.STRING(100), allowNull: false },
    name:          { type: DataTypes.STRING(200), allowNull: false },
    amount:        { type: DataTypes.FLOAT },
    unit:          { type: DataTypes.STRING(50) },
    category_id:   { type: DataTypes.INTEGER },
    barcode:       { type: DataTypes.STRING(100) },
    is_optional:   { type: DataTypes.BOOLEAN, defaultValue: false },
    substitutes:   { type: DataTypes.TEXT },
    display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, { tableName: 'recipe_ingredients', timestamps: false });
};

module.exports.RecipeStep = (sequelize) => {
  return sequelize.define('RecipeStep', {
    id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    recipe_id:        { type: DataTypes.STRING(100), allowNull: false },
    step_number:      { type: DataTypes.INTEGER, allowNull: false },
    title:            { type: DataTypes.STRING(200) },
    description:      { type: DataTypes.TEXT, allowNull: false },
    duration_minutes: { type: DataTypes.INTEGER },
    image_url:        { type: DataTypes.TEXT },
  }, { tableName: 'recipe_steps', timestamps: false });
};

module.exports.FavoriteRecipe = (sequelize) => {
  return sequelize.define('FavoriteRecipe', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:        { type: DataTypes.INTEGER, allowNull: false },
    recipe_id:      { type: DataTypes.STRING(100), allowNull: false },
    rating:         { type: DataTypes.INTEGER },
    personal_notes: { type: DataTypes.TEXT },
    saved_at:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'favorite_recipes',
    timestamps: false,
    indexes: [{ unique: true, fields: ['user_id', 'recipe_id'] }],
  });
};

module.exports.CookingHistory = (sequelize) => {
  return sequelize.define('CookingHistory', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:       { type: DataTypes.INTEGER },
    household_id:  { type: DataTypes.INTEGER },
    recipe_id:     { type: DataTypes.STRING(100) },
    servings_made: { type: DataTypes.INTEGER },
    rating:        { type: DataTypes.INTEGER },
    notes:         { type: DataTypes.TEXT },
    cooked_at:     { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'cooking_history', timestamps: false });
};

module.exports.CookingHistoryItem = (sequelize) => {
  return sequelize.define('CookingHistoryItem', {
    id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cooking_history_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id:         { type: DataTypes.INTEGER },
    quantity_used:      { type: DataTypes.FLOAT },
    unit:               { type: DataTypes.STRING(50) },
  }, { tableName: 'cooking_history_items', timestamps: false });
};
