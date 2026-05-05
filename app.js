const http = require('http')
const fs = require('fs')
const bcrypt = require('bcrypt');

const port = 3000
const express = require('express');
const cookieParser = require('cookie-parser');
const sessions = require('express-session');
const Database = require('./login.contr');

const app = express();

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// creating 24 hrs from milliseconds
const oneDay = 1000 * 60 * 60 * 24;

// sessions middleware
app.use(sessions({
    secret: 'thisismysecretkey123',
    saveUninitialized: true,
    cookie: {maxAge: oneDay},
    resave: false
}));

// parse the incoming data
app.use(express.urlencoded({ extended: true}));

app.set('view engine', 'ejs');

// cookie parser middleware
app.use(cookieParser());

// middleware to stop browser caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
})

///////////////////////////////////////////////////////
///////////////// ROUTES //////////////////////////////
///////////////////////////////////////////////////////

const database = new Database();
const port2 = 8080;
var session = null;

// home
app.get('/bank', (req, res) => {

    session = req.session;
    console.log(session.userid);

    if (session.userid) {
        res.redirect('/bank');
    }
    else {
        res.render('index');
    }
});

// send login page
app.get('/login', (req, res) => {
    res.render('login2');
});

// send signup page
app.get('/signup', (req, res) => {
    res.render('signup2');
})

// authenticate user
app.post('/loginUser', async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    console.log(`username: ${username} and ${password}`);

    const user = await database.findUser(username);

    if (!user.detected) {
        console.log('Did not find user');
        res.status(404).send('User not found');
        return;
    }
    else {
        console.log('User found');

        const creds = await database.select(username);
        const hashedPassword = creds.password;

        if (await bcrypt.compare(password, hashedPassword)) {
            
            const account = await database.getAccount(creds.userid);
            const accountSavings = account.savings;

            session = req.session;
            session.userid = creds.userid;
            session.username = creds.username;
            session.savings = accountSavings;
            console.log(req.session);

            res.status(300).send();
        }
        else {
            console.log('Invalid password');
            res.status(403).send('Invalid password');
            return;
        }
    }
});

// signup user
app.post('/signupUser', async (req, res) => {

    const parcel = req.body;
    console.log(`User: ${parcel.username}\nPass: ${parcel.password}`);

    const cred = await database.findUser(parcel.username);

    if (cred.detected) {
        console.log('User already in the db');
        res.status(404).send('User already exists');
    }
    else {
        console.log('User not in db');

        bcrypt.hash(parcel.password, 10)
            .then((hash) => {
                database.insert(parcel.username, hash);
            }).catch((error) => {
                console.log('Could not store credentials', error);
                res.status(404).send();
                return;
            });

        res.status(300).send();
    }
});

// logout
app.get('/logout', async (req, res) => {

    console.log('Current amount before logout: ' + session.savings)

    await database.updateAccount(session.userid, session.savings)
    req.session.destroy();
    res.redirect('/');
})

// BANK PAGE
app.get('/bank', async (req, res) => {

    if (!session || !session.userid) {
        res.redirect('/login');
        return;
    }

    const logs = await database.getTransactions(session.userid);

    res.render('bank', {
        session: session,
        logs: logs
    });
})

// get current session
app.get('/getSession', (req, res) => {
    const userCred = {
        username: session.username, 
        userid: session.userid,
        savings: session.savings
    }
    res.json(userCred);
})

// update amount in the account table
app.post('/updateSession', (req, res) => {
    
    session.savings = req.body.currentAmount;
    console.log('NEW UPDATED AMOUNT: ' + session.savings);
    res.status(300).send('New amount transmitted');
})

///////////////////////////////////////////////////////
/////////////// NEW BANK FEATURES /////////////////////
///////////////////////////////////////////////////////

// deposit War Bonds
app.post('/deposit', async (req, res) => {
    if (!session || !session.userid) return res.redirect('/login');

    const amount = Number(req.body.amount);
    if (amount <= 0) return res.redirect('/bank');

    session.savings += amount;

    await database.insertTransaction(session.userid, "War Bond Deposit", amount);

    res.redirect('/bank');
});

// withdraw Requisition Credits
app.post('/withdraw', async (req, res) => {
    if (!session || !session.userid) return res.redirect('/login');

    const amount = Number(req.body.amount);
    if (amount <= 0 || amount > session.savings) return res.redirect('/bank');

    session.savings -= amount;

    await database.insertTransaction(session.userid, "Requisition Withdrawal", amount);

    res.redirect('/bank');
});

// get transaction history
app.get('/getTransactions', async (req, res) => {
    if (!session || !session.userid) return res.status(403).send("Not logged in");

    const logs = await database.getTransactions(session.userid);
    res.json(logs);
});

///////////////////////////////////////////////////////
///////////////// START SERVER ////////////////////////
///////////////////////////////////////////////////////

app.listen(port2, function(error) {
    if (error) {
        console.log('Error: ', error);
    }
    else {
        console.log('Listening to port: ' + port2);
    }
})
