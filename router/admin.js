const express = require('express');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const connection = require('../utility/mysqlConn');

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads/'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Admin login page
router.get('/login', (req, res) => {
    res.render('adminlogin', {
        error: {},
        user: {}
    });
});

// Admin login verification
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM admin WHERE username = ? AND password = ?";
    connection.query(sql, [username, password], (err, result) => {
        if (err) throw err;

        if (result.length === 1) {
            req.session.admin = result[0].username;
            return res.redirect('/admin/dashboard');
        }

        return res.render('adminlogin', {
            error: {
                mobileError: "Invalid credentials",
                passwordError: ""
            },
            user: { username, password }
        });
    });
});

// Admin auth middleware
function adminAuth(req, res, next) {
    if (req.session.admin) {
        next();
    } else {
        res.redirect('/admin/login');
    }
}

// Admin dashboard with user, product, order counts
router.get('/dashboard', adminAuth, (req, res) => {
    const sql = `
        SELECT COUNT(*) AS totalUsers FROM user;
        SELECT COUNT(*) AS totalProducts FROM product;
        SELECT COUNT(*) AS totalOrders FROM orders;
        SELECT COUNT(*) AS pendingOrders FROM cart;
    `;

    connection.query(sql, (err, results) => {
        if (err) throw err;

        res.render('admindashboard', {
            totalUsers: results[0][0].totalUsers,
            totalProducts: results[1][0].totalProducts,
            totalOrders: results[2][0].totalOrders,
            pendingOrders: results[3][0].pendingOrders, // ✅ Add this
            session: req.session
        });
    });
});


// View users
router.get('/users', adminAuth, (req, res) => {
    connection.query("SELECT * FROM user", (err, result) => {
        if (err) throw err;
        res.render('adminusers', { users: result });
    });
});

// View products
router.get('/products', adminAuth, (req, res) => {
    connection.query("SELECT * FROM product", (err, result) => {
        if (err) throw err;
        res.render('adminproducts', { products: result });
    });
});

// Show add product form
router.get('/products/add', adminAuth, (req, res) => {
    res.render('addproduct', { error: null });
});

// Add product
router.post('/products/add', adminAuth, upload.single('picture'), [
    check('name').isLength({ min: 2 }).withMessage("Name is required"),
    check('price').isNumeric().withMessage("Price must be a number"),
    check('category').notEmpty().withMessage("Category is required")
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('addproduct', { error: errors.array()[0].msg });
    }

    const { name, price, category } = req.body;
    const picture = req.file ? `/uploads/${req.file.filename}` : null;
    const sql = "INSERT INTO product (name, price, category, picture) VALUES (?, ?, ?, ?)";

    connection.query(sql, [name, price, category, picture], (err) => {
        if (err) throw err;
        res.render('alert', {
            type: "success",
            title: "Product Added",
            text: "The product has been successfully added.",
            link: "/admin/products"
        });
    });
});

// Edit product form
router.get('/products/edit/:id', adminAuth, (req, res) => {
    const sql = "SELECT * FROM product WHERE pId = ?";
    connection.query(sql, [req.params.id], (err, result) => {
        if (err) throw err;
        res.render('editproduct', { product: result[0], error: null });
    });
});

// Update product
router.post('/products/edit/:id', adminAuth, upload.single('picture'), [
    check('name').notEmpty(),
    check('price').isNumeric(),
    check('category').notEmpty()
], (req, res) => {
    const errors = validationResult(req);
    const { name, price, category } = req.body;
    const pId = req.params.id;
    const newPicture = req.file ? `/uploads/${req.file.filename}` : null;

    if (!errors.isEmpty()) {
        return res.render('editproduct', {
            product: { ...req.body, pId },
            error: errors.array()[0].msg
        });
    }

    const getSQL = "SELECT picture FROM product WHERE pId = ?";
    connection.query(getSQL, [pId], (err, result) => {
        if (err) throw err;

        const currentPicture = result[0].picture;
        const pictureToUse = newPicture || currentPicture;

        const updateSQL = "UPDATE product SET name = ?, price = ?, category = ?, picture = ? WHERE pId = ?";
        connection.query(updateSQL, [name, price, category, pictureToUse, pId], (err) => {
            if (err) throw err;
            res.render('alert', {
                type: "success",
                title: "Product Updated",
                text: "The product has been successfully updated.",
                link: "/admin/products"
            });
        });
    });
});

// Delete product
router.get('/products/delete/:id', adminAuth, (req, res) => {
    const sql = "DELETE FROM product WHERE pId = ?";
    connection.query(sql, [req.params.id], (err) => {
        if (err) throw err;

        res.render('alert', {
            type: "info",
            title: "Product Deleted",
            text: "The product has been removed.",
            link: "/admin/products"
        });
    });
});

// View orders
router.get('/orders', adminAuth, (req, res) => {
    const sql = `
        SELECT o.orderId, o.mobileno, o.orderDate, o.quantity, o.status, 
               p.name AS productName, p.price
        FROM orders o
        JOIN product p ON o.pId = p.pId
        ORDER BY o.orderDate DESC
    `;

    connection.query(sql, (err, orders) => {
        if (err) {
            console.error(err);
            return res.render('alert', {
                type: 'error',
                title: 'Error',
                text: 'Unable to fetch orders.',
                link: '/admin/dashboard'
            });
        }

        res.render('adminorders', { orders });
    });
});

// Update order status
router.post('/orders/update', adminAuth, (req, res) => {
    const { orderId, status } = req.body;

    const sql = `UPDATE orders SET status = ? WHERE orderId = ?`;
    connection.query(sql, [status, orderId], (err) => {
        if (err) {
            console.error(err);
            return res.render('alert', {
                type: 'error',
                title: 'Error',
                text: 'Failed to update order status.',
                link: '/admin/orders'
            });
        }

        res.redirect('/admin/orders');
    });
});

// Admin logout
router.get('/logout', (req, res) => {
    req.session.admin = null;
    res.render('alert', {
        type: "success",
        title: "Logged Out",
        text: "Admin has been logged out.",
        link: "/admin/login"
    });
});

module.exports = router;
