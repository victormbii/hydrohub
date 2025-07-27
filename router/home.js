const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();
const connection = require('../utility/mysqlConn');

// Home Page
router.get('/', (req, res) => {
    res.render('home');
});

// User Login Page
router.get('/login', (req, res) => {
    const user = { mobileno: null, password: null };
    const error = { mobileError: null, passwordError: null };
    res.render('login', { user, error });
});

// User Register Page
router.get('/register', (req, res) => {
    const user = { email: null, mobileno: null, username: null, password: null };
    const error = { nameError: null, passwordError: null, emailError: null, mobileError: null };
    res.render('register', { user, error, regError: null });
});

// Register User
router.post('/addUser', [
    check('email').isEmail().isLength({ min: 5, max: 30 }),
    check('mobileno').isLength({ min: 10, max: 10 }),
    check('username').isLength({ min: 5, max: 20 }),
    check('password').isLength({ min: 8, max: 20 })
], (req, res) => {
    const errors = validationResult(req);
    const user = req.body;
    const error = { nameError: null, passwordError: null, emailError: null, mobileError: null };

    for (const err of errors.errors) {
        if (err.param === 'username') error.nameError = err.msg;
        else if (err.param === 'email') error.emailError = err.msg;
        else if (err.param === 'password') error.passwordError = err.msg;
        else error.mobileError = err.msg;
    }

    if (!errors.isEmpty()) {
        return res.render('register', { user, error, regError: null });
    }

    const checkSQL = "SELECT * FROM user WHERE mobileno = ?";
    connection.query(checkSQL, [user.mobileno], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            return res.render('register', { user, error, regError: 'Mobile already registered' });
        }

        const insertSQL = "INSERT INTO user (mobileno, username, email, address, password) VALUES (?, ?, ?, ?, ?)";
        connection.query(insertSQL, [user.mobileno, user.username, user.email, 'Indore', user.password], (err) => {
            if (err) throw err;

            req.session.mobileno = user.mobileno;
            res.render('alert', {
                type: "success",
                title: "Account Created",
                text: "You have successfully created your account",
                link: "user?category=drinking"
            });
        });
    });
});

// User Login Verify
router.post('/loginVerify', [
    check('mobileno').isLength({ min: 10, max: 10 }),
    check('password').isLength({ min: 8, max: 20 })
], (req, res) => {
    const errors = validationResult(req);
    const user = req.body;
    const error = { mobileError: null, passwordError: null };

    for (const err of errors.errors) {
        if (err.param === 'mobileno') error.mobileError = err.msg;
        else if (err.param === 'password') error.passwordError = err.msg;
    }

    if (!errors.isEmpty()) {
        return res.render('login', { user, error });
    }

    const sql = "SELECT * FROM user WHERE mobileno = ? AND password = ?";
    connection.query(sql, [user.mobileno, user.password], (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            return res.render('alert', {
                type: "error",
                title: "Oops...",
                text: "Invalid Mobile/Password",
                link: "login"
            });
        }

        req.session.mobileno = user.mobileno;
        res.redirect('../user?category=drinking');
    });
});

// ✅ Admin Login Page — keep just this
router.get('/adminlogin', (req, res) => {
    res.redirect('/admin/login'); // Let admin.js handle it
});

module.exports = router;
