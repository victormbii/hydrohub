const express = require('express')
const { check, validationResult } = require('express-validator');
const router = express.Router()
const connection = require('../utility/mysqlConn')

router.use('/',function(req,res,next){ 
    try
    {
        var mobileno = req.session.mobileno
          
        if(!mobileno)
        {
            res.render('Alert',{
                type:"error",
                title:"Login to continue",
                text:"You have logged out, please login to continue",
                link:"/"
            })
        }
        else
        {
            next();
        } 
    }
    catch(e)
    {
        res.redirect('/')
    }
})

router.get('/logout',function(req,res){ 
    try
    {
         req.session.mobileno = null

         res.render('Alert',{
            type:"success",
            title:"Logged Out",
            text:"You have been logged out",
            link:"/"
        })
    }
    catch(e)
    {
        res.redirect('/')
    }
})

router.get('/',function(req,res){
    try
    {
        var mobileno = req.session.mobileno
        var category = req.query.category
        var drinking = true
        var domestic = false

        if(category)
        {
            var sql1 = "select * from product where category='"+category+"' ; "
            
            if(category == 'domestic')
            {
                drinking = false
                domestic = true
            }
        }
        else
        {
            var sql1 = "select * from product where category='drinking' ; "
        }

        var sql2 = "select count(*) as cartTotal from cart where mobileno="+mobileno+" ; "
        var sql = sql1 + sql2

        connection.query(sql,function(error,result){
           
            if(error) throw error

            res.render('UserHome', {
                result: result[0],
                drinking,
                domestic,
                cartTotal: result[1],
                session: req.session // ✅ Make session available in EJS
              });
              
        })
    }
    catch(e)
    {
        res.redirect('/')
    }
})

router.post('/addToCart', function (req, res) {
    try {
        const { pId, category } = req.body;
        const mobileno = req.session.mobileno;

        if (!mobileno) {
            return res.redirect('/login'); // Or handle not-logged-in case
        }

        // Normalize category
        const productCategory = category === 'true' ? 'drinking' : 'domestic';

        const quantity = 1;

        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle existing entries
        const sql = `
            INSERT INTO cart (mobileno, pId, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + 1
        `;

        connection.query(sql, [mobileno, pId, quantity], function (err, result) {
            if (err) {
                console.error("Database error:", err);
                return res.render('Alert', {
                    type: "error",
                    title: "Database Error",
                    text: "Could not add to cart.",
                    link: "/user?category=" + productCategory
                });
            }

            return res.render('Alert', {
                type: "success",
                title: "Added to cart",
                text: "Product has been added to your cart.",
                link: "/user?category=" + productCategory
            });
        });
    } catch (e) {
        console.error("Unexpected error:", e);
        return res.redirect('/');
    }
});

router.post('/buyNow',function(req,res){  
    try
    {
        var pId = req.body.pId
        var category = req.body.category
        
        if(category == 'true')
        {
            category = 'drinking'
        }
        else
        {
            category = 'domestic'
        }

        var mobileno = req.session.mobileno
        var quantity = 1

        var sql = "insert into cart values ?"
                
        var x = [[mobileno,pId,quantity]]
                
        connection.query(sql,[x],function(err,result){
            try
            {
                if(err) throw err

                res.redirect('cart')
            }
            catch(e)
            {
                res.redirect('cart')
            }
        })
    } 
    catch(e)
    {
        res.redirect('/')
    }
})

router.get('/myAccount',function(req,res){
    try
    {
        var mobileno = req.session.mobileno

        var sql1 = "select * from user where mobileno="+mobileno+" ; "
        var sql2 = "select count(*) as cartTotal from cart where mobileno="+mobileno
        var sql = sql1 + sql2

        connection.query(sql,function(err,result){
            
            if(err) throw err
           
            res.render('MyAccount',{
                result:result[0],
                cartTotal:result[1]
            })
        })
    }
    catch(e)
    {
        res.redirect('/')
    }
})

router.get('/updateUser',function(req,res){
    try
    {
        var mobileno = req.session.mobileno
        var error = {
            nameError:null,
            addressError:null,
            emailError:null,
            passwordError:null
        }

        var sql1 = "select * from user where mobileno="+mobileno+" ; "
        var sql2 = "select count(*) as cartTotal from cart where mobileno="+mobileno
        var sql = sql1 + sql2

        connection.query(sql,function(err,result){
        
            if(err) throw err
           
            res.render('UpdateUser',{
                user:result[0],
                cartTotal:result[1]
            })
        })
    }
    catch(e)
    {
        res.redirect('/')
    }
})

router.post('/saveChangesUser', [
    check('email','Email must be of Min 5 and Max 30 length').trim().isEmail().isLength({ min: 5 , max: 30}),
    check('username','Must be of Min 5 and Max 20 length').trim().isLength({ min: 5 , max: 20}),
    check('password','Must be of Min 8 and Max 20 length').trim().isLength({ min: 8 , max: 20}),
    check('address','Must be of Min 5 and Max 20 length').trim().isLength({ min: 5 , max: 20})
  ], (req, res) => {

    try
    {
        const errors = validationResult(req);
        
        var user = {
            email: req.body.email,
            username: req.body.username,
            address: req.body.address,
            password: req.body.password,
            mobileno: req.body.mobileno
        }

        error = {
            nameError:null,
            passwordError:null,
            emailError:null,
            addressError:null
        }

        for(i = 0; i < errors.errors.length; i++)
        {
            name =  errors.errors[i].param

            if(name === 'username')
            {
                error.nameError = errors.errors[i].msg
            }
            else if(name === 'email')
            {
                error.emailError = errors.errors[i].msg
            }
            else if(name === 'password')
            {
                error.passwordError = errors.errors[i].msg
            }
            else
            {
                error.addressError = errors.errors[i].msg
            }
        }

        if (!errors.isEmpty())
        { 
            var sql = "select count(*) as cartTotal from cart where mobileno="+user.mobileno
            
            connection.query(sql,function(err,result){
                if(err) throw err
               
                res.render('Updateuser',{
                    user:[user],
                    error,
                    cartTotal:result
                })
            })
        }
        else
        {
            var sql = "update user set username='"+user.username+"', email='"+user.email+"', address='"+user.address+"', password='"+user.password+"' where mobileno="+user.mobileno+"; "
          
            connection.query(sql,function(err,result){
                
                if(err) throw err
              
                res.render('Alert',{
                    type:"success",
                    title:"Account Updated",
                    text:"You have successfully updated your account",
                    link:"/user/myAccount"
                })   
                     
            }) 
        }
    }
    catch(e)
    {
        res.redirect('/')
    }
})

router.get('/cart', function(req, res) {
    try {
        const mobileno = req.session.mobileno;

        if (!mobileno) {
            return res.redirect('/user/login'); // Redirect to login if not authenticated
        }

        const sql1 = "SELECT p.pId, p.price, p.name, p.picture, c.quantity FROM product p JOIN cart c ON p.pId = c.pId WHERE c.mobileno = ?";
        const sql2 = "SELECT COUNT(*) AS cartTotal FROM cart WHERE mobileno = ?";
        const sql3 = "SELECT SUM(p.price * c.quantity) AS total FROM cart c JOIN product p ON c.pId = p.pId WHERE c.mobileno = ?";

        const sql = `${sql1}; ${sql2}; ${sql3}`;

        connection.query(sql, [mobileno, mobileno, mobileno], function(err, results) {
            if (err) throw err;

            const cartItems = results[0];
            const cartTotal = results[1];
            const total = results[2];

            if (cartItems.length > 0) {
                res.render('Cart', {
                    result: cartItems,
                    cartTotal: cartTotal,
                    total: total,
                    error: null
                });
            } else {
                res.render('Cart', {
                    result: null,
                    cartTotal: cartTotal,
                    total: null,
                    error: 'No items in cart'
                });
            }
        });
    } catch (e) {
        console.error(e);
        res.redirect('/');
    }
});


router.post('/removeFromCart',function(req,res){ 
    try
    {
        var mobileno = req.session.mobileno
        var pId = req.body.pId

        var sql = "delete from cart where pId="+pId+" and mobileno="+mobileno
       
        connection.query(sql,function(err,result){
            
            if(err) throw err
          
            res.redirect('cart') 
        })   
    }
    catch(e)
    {
        res.redirect('/')
    }
})

router.post('/changeQuantity',function(req,res){ 
    try
    {
        var mobileno = req.session.mobileno
        var quantity = req.body.name
        var pId = req.body.pId

        var sql = "update cart set quantity="+quantity+" where pId="+pId+" and mobileno="+mobileno
       
        connection.query(sql,function(err,result){
            
            if(err) throw err
          
            res.redirect('cart')
        })    
    }
    catch(e)
    {
        res.redirect('/')
    }
})

router.get('/payment',function(req,res){ 
    try
    {
        var mobileno = req.session.mobileno

        var sql1 = "select count(*) as cartTotal from cart where mobileno="+mobileno+" ; "
        var sql2 = "select sum(p.price*c.quantity) as total from cart c,product p where c.pId = p.pId and c.mobileno="+mobileno+" ; "
        var sql = sql1+sql2
        
        connection.query(sql,function(err,result){
           
            if(err) throw err
           
            res.render('Checkout',{
                cartTotal:result[0],
                total:result[1]
            })
        })
    }
    catch(e)
    {
        res.redirect('/')
    }
})
router.get('/myorders', function (req, res) {
    try {
        const mobileno = req.session.mobileno;

        const sqlCartTotal = "SELECT COUNT(*) AS cartTotal FROM cart WHERE mobileno = ?";

        // Check if user has any orders
        const sqlOrders = `
            SELECT o.orderId, o.quantity, o.orderDate, o.status, 
                   p.name, p.price, p.picture 
            FROM orders o
            JOIN product p ON o.pId = p.pId
            WHERE o.mobileno = ?
            ORDER BY o.orderDate DESC
        `;

        connection.query(sqlOrders, [mobileno], function (err, orderResults) {
            if (err) {
                console.error("Error fetching orders:", err);
                return res.render('Alert', {
                    type: 'error',
                    title: 'Order Error',
                    text: 'Could not retrieve your orders.',
                    link: '/user'
                });
            }

            if (orderResults.length > 0) {
                // ✅ Orders exist, show them
                connection.query(sqlCartTotal, [mobileno], function (err2, cartResult) {
                    if (err2) {
                        console.error("Cart count error:", err2);
                        return res.render('Alert', {
                            type: 'error',
                            title: 'Cart Error',
                            text: 'Could not load cart info.',
                            link: '/user'
                        });
                    }

                    res.render('myorders', {
                        orders: orderResults,
                        cartTotal: cartResult[0],
                        session: req.session
                    });
                });

            } else {
                // ❌ No orders yet, show items in cart as "pending orders"
                const cartSQL = `
                    SELECT NULL as orderId, c.quantity, NOW() as orderDate, 'pending' as status,
                           p.name, p.price, p.picture
                    FROM cart c
                    JOIN product p ON c.pId = p.pId
                    WHERE c.mobileno = ?
                `;

                connection.query(cartSQL, [mobileno], function (err3, cartOrders) {
                    if (err3) {
                        console.error("Cart fetch error:", err3);
                        return res.render('Alert', {
                            type: 'error',
                            title: 'Cart Fetch Failed',
                            text: 'There was an error loading your cart.',
                            link: '/user'
                        });
                    }

                    connection.query(sqlCartTotal, [mobileno], function (err4, cartTotalResult) {
                        if (err4) {
                            console.error("Cart count error:", err4);
                            return res.render('Alert', {
                                type: 'error',
                                title: 'Cart Error',
                                text: 'Unable to fetch cart count.',
                                link: '/user'
                            });
                        }

                        res.render('myorders', {
                            orders: cartOrders,
                            cartTotal: cartTotalResult[0],
                            session: req.session
                        });
                    });
                });
            }
        });

    } catch (e) {
        console.error("Unexpected error:", e);
        res.render('Alert', {
            type: 'error',
            title: 'Unexpected Error',
            text: 'Something went wrong while loading your orders.',
            link: '/user'
        });
    }
});
// Place Order Route (POST /user/placeOrder)
router.post('/placeOrder', (req, res) => {
    const mobileno = req.session.mobileno;
    const { address, deliveryCharges, finalTotal, paymentMethod } = req.body;

    if (!mobileno) {
        return res.render("Alert", {
            type: "error",
            title: "Not Logged In",
            text: "Please login to place an order.",
            link: "/login"
        });
    }

    const fetchCartQuery = `
        SELECT c.pId, c.quantity, p.price 
        FROM cart c 
        JOIN product p ON c.pId = p.pId 
        WHERE c.mobileno = ?
    `;

    connection.query(fetchCartQuery, [mobileno], (err, cartItems) => {
        if (err) {
            console.error("Fetch cart error:", err);
            return res.render("Alert", {
                type: "error",
                title: "Order Failed",
                text: "Could not fetch cart items. Please try again.",
                link: "/user/cart"
            });
        }

        if (cartItems.length === 0) {
            return res.render("Alert", {
                type: "info",
                title: "Cart Empty",
                text: "Your cart is empty. Add products before placing an order.",
                link: "/user"
            });
        }

        const insertOrderQuery = `
            INSERT INTO orders 
            (mobileno, pId, quantity, orderDate, status, address, deliveryFee, paymentMethod) 
            VALUES (?, ?, ?, NOW(), 'Pending', ?, ?, ?)
        `;

        // Include address, deliveryFee and paymentMethod for each row
        const values = cartItems.map(item => [
            mobileno,
            item.pId,
            item.quantity,
            address,
            deliveryCharges,
            paymentMethod
        ]);

        connection.beginTransaction(err => {
            if (err) {
                console.error("Transaction start error:", err);
                return res.render("Alert", {
                    type: "error",
                    title: "Transaction Error",
                    text: "Could not start database transaction.",
                    link: "/user"
                });
            }

            const insertPromises = values.map(val =>
                new Promise((resolve, reject) => {
                    connection.query(insertOrderQuery, val, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                })
            );

            Promise.all(insertPromises)
                .then(() => {
                    connection.query("DELETE FROM cart WHERE mobileno = ?", [mobileno], (err2) => {
                        if (err2) {
                            return connection.rollback(() => {
                                console.error("Cart deletion failed:", err2);
                                res.render("Alert", {
                                    type: "error",
                                    title: "Error Clearing Cart",
                                    text: "Could not clear cart after placing order.",
                                    link: "/user"
                                });
                            });
                        }

                        connection.commit(err3 => {
                            if (err3) {
                                return connection.rollback(() => {
                                    console.error("Commit failed:", err3);
                                    res.render("Alert", {
                                        type: "error",
                                        title: "Checkout Failed",
                                        text: "Transaction could not be completed.",
                                        link: "/user"
                                    });
                                });
                            }

                            res.render("Alert", {
                                type: "success",
                                title: "Order Placed!",
                                text: "Your order has been successfully placed.",
                                link: "/user/myorders"
                            });
                        });
                    });
                })
                .catch(insertErr => {
                    connection.rollback(() => {
                        console.error("Insert order error:", insertErr);
                        res.render("Alert", {
                            type: "error",
                            title: "Order Failed",
                            text: "Could not complete the order. Please try again.",
                            link: "/user"
                        });
                    });
                });
        });
    });
});




module.exports = router