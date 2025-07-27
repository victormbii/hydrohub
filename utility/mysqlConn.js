const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost', // XAMPP default host
    user: 'root', // XAMPP default username
    password: '', // XAMPP default password (usually empty)
    database: 'hydrohub', // Replace with your database name in phpMyAdmin
    multipleStatements: true
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database on XAMPP');
});

setInterval(keepAlive, 180000);

function keepAlive() {
    connection.query('SELECT 1', (err) => {
        if (err) console.error('Keep-alive failed:', err);
        else console.log("Fired Keep-Alive");
    });
}

module.exports = connection;
