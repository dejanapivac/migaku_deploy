const jwt = require("jsonwebtoken");
require('dotenv').config();

function jwtGenerator(id){
    const payload = {
        user: id
    }

    return jwt.sign(payload, process.env.jwtSecret, {algorithm: "HS512", expiresIn: "7d"});
}

module.exports = jwtGenerator;