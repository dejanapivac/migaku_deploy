const Pool = require("pg").Pool

const developmentConfig = {
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DATABASE,
    ssl:{
        rejectUnauthorized: false
    }
}

const productionConfig = {
    connectionString: process.env.POSTGRES_URL,
    ssl:{
        rejectUnauthorized: false
    }
}

const pool = new Pool(process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig);

module.exports = pool;