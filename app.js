const express = require('express');
const bodyparser = require('body-parser');
const session = require('express-session');
const path = require('path');

const homeRouter = require('./router/home');
const userRouter = require('./router/user');
const adminRouter = require('./router/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(express.static(path.join(__dirname, 'public'))); // ✅ includes /uploads

// Sessions
app.use(session({
    secret: 'My Secret Key',
    resave: true,
    saveUninitialized: true
}));

// Views
app.set('views', [path.join(__dirname, 'templates/views')]);
app.set('view engine', 'ejs');

// Routers
app.use('/', homeRouter);
app.use('/user', userRouter);
app.use('/admin', adminRouter); // ✅ Mount admin routes

// 404 fallback
app.get('*', function (req, res) {
    res.status(404).render('404');
});

// Start server
app.listen(PORT, function (error) {
    if (error) throw error;
    console.log("✅ Server running at http://localhost:" + PORT);
});

