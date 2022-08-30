const { check, validationResult} = require('express-validator');

exports.registerValidation = [
    check('name')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Name can not be empty!')
        .bail()
        .isLength({min: 1})
        .withMessage('Minimum 1 characters required!')
        .bail(),
    check('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required!')
        .isEmail()
        .withMessage('Please provide a valid email!')
        .bail(),
    check('password')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Password can not be empty!')
        .bail()
        .isLength({min: 6})
        .withMessage('Minimum 6 characters required!')
        .bail()
]
exports.loginValidation = [
    check('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required!')
        .isEmail()
        .withMessage('Please provide a valid email!')
        .bail(),
    check('password')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Password can not be empty!')
]

exports.userValidationResult = (req,res,next)=>{
    const result = validationResult(req);
    if(!result.isEmpty()){
        const error = result.array()[0].msg;
        return res.status(422).json({ error: error });
    }
    next();
}