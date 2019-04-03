var app = require('express')();
require("autogitupdater")("/webhook/autogit/ZLsPVBeuYZt3fpcLsFCXu9eBNMVwFzgt74uK8EazpWXswN6rK7GZNFDqGTJT9gFKKTDrsNKabAanuxeGJSTsqkYAZ5r5TNKRxEpVwwAUUYfnNAcw9RLz86X4H55PDEmNTjn4JSCa337LddVfAFryK64pb2yYWfgVv8v6nCcrvUu4jqDSqMwCyLn9LPZXJAfjv9KFgRWxXBtnEyURuG7z9vsTbYYfYQGQuKNDn48NvuRKKpCeJzQVpae7uWXxjphj", app);
var fs = require("fs");
var server = require('https').createServer({key: fs.readFileSync('B:/SSL/private.key', 'utf8'), cert: fs.readFileSync('B:/SSL/certificate.crt', 'utf8')}, app);

var io = require('socket.io')(server);
var cookieParser = require('cookie-parser')
var port = process.env.PORT || 85;

var path = require("path");
var scrypt = require('js-scrypt')
const nodemailer = require('nodemailer');
var mysql = require('mysql');

let transporter = nodemailer.createTransport({
    host: "send.one.com",
    port: 465,
    secure: true,
    auth: {
        user: "no-reply@usp-3.fr",
        pass: "mamamapapapa"
    }
});

var con = mysql.createConnection(require("B:/db_public.json"));
con.connect(function(err) {
    if (err) throw err;
    log("MYSQL: CONNECTED");
});

async function sendPasswordRequestMail(user_name, user_email, user_recup_url, callback){
    let message = {
      from: 'Cash Flow <no-reply@usp-3.fr>',
      to: user_name + ' <' + user_email + '>',
      subject: 'Password reset request ✔',
      text: 'Go here to reset your password: ' + user_recup_url,
      html: '<b>Hello ' + user_name + ',</b><p>A password reset request was made on your account.</p><p>Go here to reset your password: <a href="'+user_recup_url+'">Click here</a></p><p>If you do not want to reset your password, skip this email and no action will be taken.</p>'
    };
    
    transporter.sendMail(message, (err, info) => {
      if (err) {
        callback(false, err.message);
      }else{
        log('Message sent: ' + info.messageId);
        trello_log("Mail de récupération", "Mail de récupération de mot de passe envoyé à " + user_email);
        callback(true, info.messageId);
      }
    });
}

async function generatePasswordResetToken(email, callback){
    con.query('SELECT tokens FROM `cashflow_users` WHERE `email`= ?', [email], function (err, result) {
        if (err) throw err;
        var token = random();
        var tokensJSON = JSON.parse(result[0]["tokens"]);
        tokensJSON[token] = Date.now();
        con.query('UPDATE `cashflow_users` SET `tokens`= ? WHERE `email`= ?', [JSON.stringify(tokensJSON), email]);
        callback(token);
    });
}

async function getUserInfos(email, callback) {
    con.query('SELECT data FROM `cashflow_users` WHERE `email`= ?', [email], function (err, result) {
        if (err) throw err;
        if (result[0]["data"]){
            callback(true, JSON.parse(result[0]["data"]));
        }else{
            callback(false);
        }
    });
}

async function CheckOnlineByToken(email, token, callback){
    con.query('SELECT tokens FROM `cashflow_users` WHERE `email`= ?', [email], function (err, result) {
        if (err) throw err;
        if (result[0] && result[0]["tokens"]){
            var tokens = JSON.parse(result[0]["tokens"]);
            if (tokens[token] && (tokens[token] <= Date.now() + 86400000*22)){
                callback(true);
            }else{
                callback(false);
            }
        }else{
            callback(false);
        }
    });
}

async function registerUser(email, pass, infos, callback){

    var hashed_pass = scrypt.hashSync(Buffer(pass), Buffer(email)).toString("hex");
    var token = random();

    var tokensJSON = {};
    tokensJSON[token] = Date.now();

    con.query('INSERT INTO `cashflow_users` (`email`, `password`, `data`, `tokens`) VALUES (?, ?, ?, ?)', [email, hashed_pass, JSON.stringify({config: false,infos: infos}), JSON.stringify(tokensJSON)], function(){
        trello_log("NOUVEAU COMPTE", "COMPTE CRÉE : " + email);
        callback(token);
    });    
}

async function connectUser(email, pass, callback){
    var form_hashed_pass = scrypt.hashSync(Buffer(pass), Buffer(email)).toString("hex");

    con.query('SELECT * FROM `cashflow_users` WHERE `email`= ?', [email], function (err, result) {
        if (form_hashed_pass == result[0]["password"]){
            var token = random();
            var tokensJSON = JSON.parse(result[0]["tokens"]);
            tokensJSON[token] = Date.now();
            con.query('UPDATE `cashflow_users` SET `tokens` = ? WHERE `email` = ?', [JSON.stringify(tokensJSON), email], function(err){
                trello_log("Utilisateur connecté", "Utilisateur connecté : " + email);
                (!err) ? callback(token) : callback("");
            })
        }else{
            callback("");
        }
    });
}

async function userExists(email, callback){
    con.query('SELECT id FROM `cashflow_users` WHERE `email`= ?', [email], function (err, result) {
        (result[0] && result[0]['id']) ? callback(true) : callback(false);
    });
}


function clearSessions(email, activeToken) {
    var tokensJSON = {};
    tokensJSON[activeToken] = Date.now();
    con.query('UPDATE `cashflow_users` SET `tokens` = ? WHERE `email` = ?', [JSON.stringify(tokensJSON), email]);
}

app.use(cookieParser());

app.get('/', function(req, res) {
    res.redirect('/login');
});

app.get('/seturl/:port', function(req, res) {
    require('https').get("https://cash-flow.usp-3.fr/seturl/" + req.hostname + ":" + req.params.port, (msg)=>{})
    res.send('URL SET TO : ' + req.hostname + ":" + req.params.port);
    trello_log("#IMPORTANT **DEFAULT_SERV_CHANGE**", "**Serveur par défault définit sur : **" + req.hostname + ":" + req.params.port);
});

app.get('/rspass/:email/:token', function(req, res){
    log("Get /rspass/" + req.params.email + "/" + req.params.token);
    CheckOnlineByToken(req.params.email, req.params.token, function(connected) {
        if (connected){
            res.sendFile(path.join(__dirname + '/pages/rspass.html'));
        }else{
            res.redirect('/login');
        }
    })
})

app.get('/rspass/:email/:token/:newpassword', function(req, res){
    log("Get /rspass/" + req.params.email + "/" + req.params.token + "/" + req.params.newpassword);
    CheckOnlineByToken(req.params.email, req.params.token, function(connected) {
        if (connected){
            var hashed_pass = scrypt.hashSync(Buffer(req.params.newpassword), Buffer(req.params.email)).toString("hex");
            con.query('UPDATE `cashflow_users` SET `password` = ? WHERE `email` = ?', [hashed_pass, req.params.email], function(){ 
                clearSessions(req.params.email, req.params.token);
            });
        }
    })
    res.redirect('/login');
})

app.get('/login', function(req, res) {
    log("Get /login");
    CheckOnlineByToken(req.cookies.username, req.cookies.session, function(connected) {
        if (connected){
            res.redirect('/dashboard');
        }else{
            res.sendFile(path.join(__dirname + '/pages/login.html'));
        }
    })
});

app.get('/dashboard', function(req, res) {
    log("Get /dashboard");
    CheckOnlineByToken(req.cookies.username, req.cookies.session, function(connected) {
        if (connected){
            res.sendFile(path.join(__dirname + '/pages/index.html'));
        }else{
            res.redirect('/login');
        }
    })
});

app.get('/crash', function(req, res){
    log("Crashing process")
    trello_log("#IMPORTANT **Processus crashé**", "**Processus crashé**");
    process.exit(1);
})

app.use("/", require('express').static(__dirname + "/public"));

io.on('connection', function(client){

    client.on('dashboard_load', function(data){
        client.emit("dashboard_load", {
            salary_table: [
                {
                  image: "https://yt3.ggpht.com/-0Fuh_nnJsb8/AAAAAAAAAAI/AAAAAAAAANg/BceuM6rc9_4/s288-mo-c-c0xffffffff-rj-k-no/photo.jpg",
                  work: "UX Designer",
                  at: "Inhérence conseil",
                  salary: 3024,
                  bonus: 254,
                  total: 3278
                },
                {
                  image: "https://yt3.ggpht.com/-0Fuh_nnJsb8/AAAAAAAAAAI/AAAAAAAAANg/BceuM6rc9_4/s288-mo-c-c0xffffffff-rj-k-no/photo.jpg",
                  work: "UX Designer",
                  at: "Murex",
                  salary: 3187,
                  bonus: 567,
                  total: 3278
                },
                {
                  image: "https://yt3.ggpht.com/-0Fuh_nnJsb8/AAAAAAAAAAI/AAAAAAAAANg/BceuM6rc9_4/s288-mo-c-c0xffffffff-rj-k-no/photo.jpg",
                  work: "UX Designer",
                  at: "Murex",
                  salary: 3187,
                  bonus: 567,
                  total: 3278
                },
                {
                  image: "https://yt3.ggpht.com/-0Fuh_nnJsb8/AAAAAAAAAAI/AAAAAAAAANg/BceuM6rc9_4/s288-mo-c-c0xffffffff-rj-k-no/photo.jpg",
                  work: "UX Designer",
                  at: "Murex",
                  salary: 3187,
                  bonus: 567,
                  total: 3278
                },
                {
                  image: "https://yt3.ggpht.com/-0Fuh_nnJsb8/AAAAAAAAAAI/AAAAAAAAANg/BceuM6rc9_4/s288-mo-c-c0xffffffff-rj-k-no/photo.jpg",
                  work: "UX Designer",
                  at: "Murex",
                  salary: 3187,
                  bonus: 567,
                  total: 3278
                }
            ]
        })
    })

    client.on('loginpage_register', function(data, callback){ // Inscription
        log("Création du compte " + data.email);
        if (emailValid(data.email)){

            if (data.pass.length <= 5){
                callback({
                    status: false,
                    error: {
                        id:"TOO_WEAK",
                        text:"The password is too weak"
                    }
                });
            }
            
            userExists(data.email, function (exists) {
                if (!exists){

                    var account_infos = {
                        double: data.doubleaccount,
                        u1: data.u1
                    };

                    if (data.doubleaccount) account_infos.u2 = data.u2;
                    
                    registerUser(data.email, data.pass, account_infos, function(token){
                        callback({
                            status: true,
                            session:{
                                username: data.email,
                                token: token
                            }
                        });
                    })
                    
                }else{
                    callback({
                        status: false,
                        error: {
                            id:"ALREADY_EXISTS",
                            text:"An account with this email already exists, please log in."
                        }
                    });
                }
            });

        }else{
            callback({
                status: false,
                error: {
                    id:"WRONG",
                    text:"The email is invalid"
                }
            });
        }
    })

    client.on('loginpage_login', function(data, callback){
        log("Connexion au compte : " + data.email);
        if (emailValid(data.email)){

            if (data.pass.length <= 5){
                callback({
                    status: false,
                    error: {
                        id:"WRONG",
                        text:"Unknown user"
                    }
                });
            }else{
                userExists(data.email, function(exists){
                    if (exists){
                        connectUser(data.email, data.pass, function(token){
                            if (token != ""){
                                callback({
                                    status: true,
                                    session:{
                                        username: data.email,
                                        token: token
                                    }
                                });
                            }else{
                                callback({
                                    status: false,
                                    error: {
                                        id:"WRONG",
                                        text:"Unknown user" // Mauvais mot de passe
                                    }
                                });
                            }
                        })
                    }else{
                        callback({
                            status: false,
                            error: {
                                id:"WRONG",
                                text:"Unknown user"
                            }
                        });
                    }
                })
            } 
        }else{
            callback({
                status: false,
                error: {
                    id:"WRONG",
                    text:"The email is invalid"
                }
            });
        }
    })

    client.on('loginpage_forgotPass', function(data, callback){
        log("Récupération du mot de passe du compte : " + data.email);
        if (emailValid(data.email)){
            
            userExists(data.email, function (exists) {
                if (exists){
                    getUserInfos(data.email, function(rs, userInfos){
                        generatePasswordResetToken(data.email, function(passwordResetToken){
                            sendPasswordRequestMail(userInfos.infos.u1.fname + " " + userInfos.infos.u1.name, data.email, "https://cash-flow.usp-3.fr/rspass/" + data.email + "/" + passwordResetToken, function(rs, text) {
                                if (rs){
                                    callback({status: true});
                                }else{
                                    callback({
                                        status: false,
                                        error: {
                                            id:"EMAIL_ERROR",
                                            text:"Can't send the email"
                                        }
                                    });
                                }
                            })
                        })
                    });
                }else{
                    callback({
                        status: false,
                        error: {
                            id:"NOT_FOUND",
                            text:"No account with this email was found"
                        }
                    });
                }
            });

        }else{
            callback({
                status: false,
                error: {
                    id: "WRONG",
                    text: "The email is invalid"
                }
            });
        }
    })

});

function emailValid(email){
    if (email.length >= 5 && email.length <= 50 && !email.includes(" ") && email.includes("@") && !includes_array(email, ['\\', '/', ':', ';', ',', '*', '?', '!', '"', '<', '>', '|', "'", '%', '#', '+']) && email.includes(".")){
        return true;
    }else{
        return false;
    } 
}

function includes_array(str, array){
    var result = false;
    array.forEach(el => {
        if (str.includes(el)) result = true;
    });
    return result;
}

function random(){
    return Math.random().toString(36).replace('0.', '') + Math.random().toString(36).replace('0.', '') + Math.random().toString(36).replace('0.', '') + Math.random().toString(36).replace('0.', '');
}

function log(log) { console.log("[Cash Flow]: " + log); }

function trello_log(title, text){
    transporter.sendMail({
        from: 'Cash Flow App <no-reply@usp-3.fr>',
        to: 'Log <mathieucolmon+0y1xvb0vuocxligiwml2@boards.trello.com>',
        subject: "#Log " + title,
        text:  text,
    }, ()=>{});
}

server.listen(port);
log("Listening on port : " + port)
