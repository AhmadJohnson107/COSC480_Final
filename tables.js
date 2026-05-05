const Sequelize = require('sequelize');
var DataTypes = require('sequelize/lib/data-types');
require('dotenv').config();

async function init() {

    // Database credentials
    const hostname = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const pass = process.env.DB_PASSWORD;
    const db = process.env.DB_DATABASE;
    const port = process.env.DB_PORT;

    // Sequelize connection
    const sequelize = new Sequelize(
        db, user, pass,
        {
            host: hostname,
            dialect: 'mysql'
        }
    );

    // Authenticate
    try {
        await sequelize.authenticate();
        console.log("Database connection established.");
    } catch (err) {
        console.error("Unable to connect:", err);
    }

    // ============================
    // MODELS
    // ============================

    // USER MODEL
    const User = sequelize.define('user', {
        username: {
            type: DataTypes.STRING,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });

    // ACCOUNT MODEL
    const Account = sequelize.define('accounts', {
        account: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            allowNull: false
        },
        rank: {
            type: DataTypes.STRING,
            defaultValue: "Recruit"
        }
    });

    // TRANSACTION MODEL
    const Transaction = sequelize.define('transactions', {
        type: {
            type: DataTypes.STRING,
            allowNull: false   // "War Bond Deposit" or "Requisition Withdrawal"
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false
        }
    });

    // ============================
    // ASSOCIATIONS
    // ============================

    // One user → one account
    User.hasOne(Account, { foreignKey: "userId" });
    Account.belongsTo(User, { foreignKey: "userId" });

    // One user → many transactions
    User.hasMany(Transaction, { foreignKey: "userId" });
    Transaction.belongsTo(User, { foreignKey: "userId" });

    // ============================
    // SYNC TABLES
    // ============================

    try {
        await sequelize.sync();
        console.log("Tables synced successfully.");
    } catch (err) {
        console.log("Unable to sync tables:", err);
    }

    // Export models for use in routes
    return { sequelize, User, Account, Transaction };
}

module.exports = init;
