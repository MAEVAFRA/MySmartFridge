const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

// ─── Import des modèles ───────────────────────────────────────────
const User              = require('./User')(sequelize);
const UserSession       = require('./UserSession')(sequelize);
const PushToken         = require('./PushToken')(sequelize);
const PasswordReset     = require('./PasswordReset')(sequelize);
const Household         = require('./Household')(sequelize);
const HouseholdMember   = require('./HouseholdMember')(sequelize);
const HouseholdInvitation = require('./HouseholdInvitation')(sequelize);
const Location          = require('./Location')(sequelize);
const ProductCategory   = require('./ProductCategory')(sequelize);
const Product           = require('./Product')(sequelize);

const { ProductTag, BarcodeCache, ReceiptScan, ReceiptScanItem } = require('./ScanModels');
const ProductTagModel       = ProductTag(sequelize);
const BarcodeCacheModel     = BarcodeCache(sequelize);
const ReceiptScanModel      = ReceiptScan(sequelize);
const ReceiptScanItemModel  = ReceiptScanItem(sequelize);

const { Recipe, RecipeIngredient, RecipeStep, FavoriteRecipe, CookingHistory, CookingHistoryItem } = require('./RecipeModels');
const RecipeModel             = Recipe(sequelize);
const RecipeIngredientModel   = RecipeIngredient(sequelize);
const RecipeStepModel         = RecipeStep(sequelize);
const FavoriteRecipeModel     = FavoriteRecipe(sequelize);
const CookingHistoryModel     = CookingHistory(sequelize);
const CookingHistoryItemModel = CookingHistoryItem(sequelize);

const { Expense, ExpenseSplit, ExpenseCategoryBudget, ShoppingList, ShoppingItem } = require('./ShoppingModels');
const ExpenseModel               = Expense(sequelize);
const ExpenseSplitModel          = ExpenseSplit(sequelize);
const ExpenseCategoryBudgetModel = ExpenseCategoryBudget(sequelize);
const ShoppingListModel          = ShoppingList(sequelize);
const ShoppingItemModel          = ShoppingItem(sequelize);

const { Notification, NotifSettings, ProductConsumptionLog, MonthlyStatsSnapshot, AuditLog } = require('./MiscModels');
const NotificationModel          = Notification(sequelize);
const NotifSettingsModel         = NotifSettings(sequelize);
const ProductConsumptionLogModel = ProductConsumptionLog(sequelize);
const MonthlyStatsSnapshotModel  = MonthlyStatsSnapshot(sequelize);
const AuditLogModel              = AuditLog(sequelize);

// ─── Associations ─────────────────────────────────────────────────

// User
User.hasMany(UserSession,    { foreignKey: 'user_id', as: 'sessions',       onDelete: 'CASCADE' });
User.hasMany(PushToken,      { foreignKey: 'user_id', as: 'pushTokens',     onDelete: 'CASCADE' });
User.hasMany(PasswordReset,  { foreignKey: 'user_id', as: 'passwordResets', onDelete: 'CASCADE' });
UserSession.belongsTo(User,  { foreignKey: 'user_id' });
PushToken.belongsTo(User,    { foreignKey: 'user_id' });
PasswordReset.belongsTo(User,{ foreignKey: 'user_id' });

// Household
User.hasMany(Household,              { foreignKey: 'created_by', as: 'ownedHouseholds' });
Household.belongsTo(User,            { foreignKey: 'created_by', as: 'owner' });
Household.hasMany(HouseholdMember,   { foreignKey: 'household_id', as: 'members',     onDelete: 'CASCADE' });
Household.hasMany(HouseholdInvitation,{ foreignKey: 'household_id', as: 'invitations', onDelete: 'CASCADE' });
User.hasMany(HouseholdMember,        { foreignKey: 'user_id', as: 'householdMemberships' });
HouseholdMember.belongsTo(User,      { foreignKey: 'user_id' });
HouseholdMember.belongsTo(Household, { foreignKey: 'household_id' });
HouseholdInvitation.belongsTo(Household, { foreignKey: 'household_id' });
HouseholdInvitation.belongsTo(User,      { foreignKey: 'invited_by', as: 'invitedBy' });

// Location
Household.hasMany(Location, { foreignKey: 'household_id', as: 'locations', onDelete: 'CASCADE' });
Location.belongsTo(Household, { foreignKey: 'household_id' });

// ProductCategory (auto-référence)
ProductCategory.hasMany(ProductCategory, { foreignKey: 'parent_id', as: 'subcategories' });
ProductCategory.belongsTo(ProductCategory, { foreignKey: 'parent_id', as: 'parent' });

// Product
Household.hasMany(Product,       { foreignKey: 'household_id', as: 'products', onDelete: 'CASCADE' });
Location.hasMany(Product,        { foreignKey: 'location_id',  as: 'products', onDelete: 'SET NULL' });
ProductCategory.hasMany(Product, { foreignKey: 'category_id',  as: 'products', onDelete: 'SET NULL' });
User.hasMany(Product,            { foreignKey: 'added_by',     as: 'addedProducts' });
Product.belongsTo(Household,       { foreignKey: 'household_id' });
Product.belongsTo(Location,        { foreignKey: 'location_id', as: 'location' });
Product.belongsTo(ProductCategory, { foreignKey: 'category_id', as: 'category' });
Product.belongsTo(User,            { foreignKey: 'added_by',    as: 'addedBy' });
Product.hasMany(ProductTagModel,   { foreignKey: 'product_id',  as: 'tags', onDelete: 'CASCADE' });
ProductTagModel.belongsTo(Product, { foreignKey: 'product_id' });

// ReceiptScan
Household.hasMany(ReceiptScanModel,    { foreignKey: 'household_id', as: 'receiptScans', onDelete: 'CASCADE' });
User.hasMany(ReceiptScanModel,         { foreignKey: 'scanned_by',   as: 'scans' });
ReceiptScanModel.belongsTo(Household,  { foreignKey: 'household_id' });
ReceiptScanModel.belongsTo(User,       { foreignKey: 'scanned_by',   as: 'scannedBy' });
ReceiptScanModel.hasMany(ReceiptScanItemModel, { foreignKey: 'scan_id', as: 'items', onDelete: 'CASCADE' });
ReceiptScanItemModel.belongsTo(ReceiptScanModel, { foreignKey: 'scan_id' });
Product.belongsTo(ReceiptScanModel, { foreignKey: 'scan_id', as: 'receiptScan' });

// Recipe
RecipeModel.hasMany(RecipeIngredientModel, { foreignKey: 'recipe_id', as: 'ingredients', onDelete: 'CASCADE' });
RecipeModel.hasMany(RecipeStepModel,       { foreignKey: 'recipe_id', as: 'steps',       onDelete: 'CASCADE' });
RecipeIngredientModel.belongsTo(RecipeModel, { foreignKey: 'recipe_id' });
RecipeStepModel.belongsTo(RecipeModel,       { foreignKey: 'recipe_id' });
User.hasMany(FavoriteRecipeModel,  { foreignKey: 'user_id',   as: 'favoriteRecipes' });
FavoriteRecipeModel.belongsTo(User,       { foreignKey: 'user_id' });
FavoriteRecipeModel.belongsTo(RecipeModel,{ foreignKey: 'recipe_id' });

// CookingHistory
Household.hasMany(CookingHistoryModel, { foreignKey: 'household_id', as: 'cookingHistory' });
User.hasMany(CookingHistoryModel,      { foreignKey: 'user_id',      as: 'cookingHistory' });
CookingHistoryModel.belongsTo(User,      { foreignKey: 'user_id' });
CookingHistoryModel.belongsTo(Household, { foreignKey: 'household_id' });
CookingHistoryModel.belongsTo(RecipeModel, { foreignKey: 'recipe_id' });
CookingHistoryModel.hasMany(CookingHistoryItemModel, { foreignKey: 'cooking_history_id', as: 'items', onDelete: 'CASCADE' });
CookingHistoryItemModel.belongsTo(CookingHistoryModel, { foreignKey: 'cooking_history_id' });

// Expense
Household.hasMany(ExpenseModel, { foreignKey: 'household_id', as: 'expenses', onDelete: 'CASCADE' });
User.hasMany(ExpenseModel,      { foreignKey: 'paid_by',      as: 'paidExpenses' });
ExpenseModel.belongsTo(Household, { foreignKey: 'household_id' });
ExpenseModel.belongsTo(User,      { foreignKey: 'paid_by', as: 'paidBy' });
ExpenseModel.hasMany(ExpenseSplitModel, { foreignKey: 'expense_id', as: 'splits', onDelete: 'CASCADE' });
ExpenseSplitModel.belongsTo(ExpenseModel, { foreignKey: 'expense_id' });
ExpenseSplitModel.belongsTo(User,         { foreignKey: 'user_id' });

// ShoppingList
Household.hasMany(ShoppingListModel, { foreignKey: 'household_id', as: 'shoppingLists', onDelete: 'CASCADE' });
ShoppingListModel.belongsTo(Household, { foreignKey: 'household_id' });
ShoppingListModel.hasMany(ShoppingItemModel, { foreignKey: 'list_id', as: 'items', onDelete: 'CASCADE' });
ShoppingItemModel.belongsTo(ShoppingListModel, { foreignKey: 'list_id' });

// Notification
User.hasMany(NotificationModel, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });
NotificationModel.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(NotifSettingsModel,  { foreignKey: 'user_id', as: 'notifSettings', onDelete: 'CASCADE' });
NotifSettingsModel.belongsTo(User, { foreignKey: 'user_id' });

// Logs & Stats
Household.hasMany(ProductConsumptionLogModel, { foreignKey: 'household_id', as: 'consumptionLogs' });
Household.hasMany(MonthlyStatsSnapshotModel,  { foreignKey: 'household_id', as: 'monthlyStats' });

// ─── Export ───────────────────────────────────────────────────────
module.exports = {
  sequelize,
  Sequelize,
  User,
  UserSession,
  PushToken,
  PasswordReset,
  Household,
  HouseholdMember,
  HouseholdInvitation,
  Location,
  ProductCategory,
  Product,
  ProductTag:           ProductTagModel,
  BarcodeCache:         BarcodeCacheModel,
  ReceiptScan:          ReceiptScanModel,
  ReceiptScanItem:      ReceiptScanItemModel,
  Recipe:               RecipeModel,
  RecipeIngredient:     RecipeIngredientModel,
  RecipeStep:           RecipeStepModel,
  FavoriteRecipe:       FavoriteRecipeModel,
  CookingHistory:       CookingHistoryModel,
  CookingHistoryItem:   CookingHistoryItemModel,
  Expense:              ExpenseModel,
  ExpenseSplit:         ExpenseSplitModel,
  ExpenseCategoryBudget: ExpenseCategoryBudgetModel,
  ShoppingList:         ShoppingListModel,
  ShoppingItem:         ShoppingItemModel,
  Notification:         NotificationModel,
  NotifSettings:        NotifSettingsModel,
  ProductConsumptionLog: ProductConsumptionLogModel,
  MonthlyStatsSnapshot: MonthlyStatsSnapshotModel,
  AuditLog:             AuditLogModel,
};
