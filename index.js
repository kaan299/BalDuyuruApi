const express = require('express');
const {v4} = require('uuid');

const app = express();
app.use(express.json());

var admin = require("firebase-admin");
var serviceAccount = require("./service-account.json");

var firebase = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
var db = firebase.firestore();
db.settings({ignoreUndefinedProperties: true})
const rolesCollection = db.collection('roles');

app.post('/academicians', (req, res) => {
    admin.auth().createUser({
        email: req.body.email,
        emailVerified: true,
        password: req.body.password,
        displayName: req.body.displayName,
        disabled: false,
    }).then(response => {
        rolesCollection.doc(v4()).set({
            departmentId: req.body.departmentId,
            facultyId: req.body.facultyId,
            roles: [
                req.body.role
            ],
            userId: response.uid
        });

        res.header("userId", response.uid);
        res.send(201);
    }).catch(error => {
        res.status(400).send({
            errorMessage: error.toString()
        });
    });
});

app.delete('/academicians/:academicianId', (req, res) => {
    admin.auth().deleteUser(req.params.academicianId)
        .then(() => {
            db.collection("roles")
                .where('userId', '==', req.params.academicianId)
                .get()
                .then(snapshot => {
                    snapshot.forEach(doc => {
                        rolesCollection.doc(doc.id).delete();
                    });
                });

            res.send(200);
        })
        .catch(error => {
            res.status(400).send({
                errorMessage: error.toString()
            });
        });
});

app.get('/academicians', (req, res) => {
    admin.auth().listUsers(100)
        .then(usersData => {
            var users = usersData.users;

            db.collection("roles")
                .get()
                .then(snapshot => {
                    const filteredRoles = snapshot.docs.map(x => x.data()).filter(doc => doc.roles.includes("fakulte") || doc.roles.includes("bolum"));
                    const filteredUsers = users
                        .filter(user => filteredRoles.some(role => role.userId === user.uid))
                        .map(user => {
                            return {
                                id: user.uid,
                                displayName: user.displayName,
                                email: user.email
                            }
                        })
                    res.status(200).send(filteredUsers);
                });
        })
        .catch(error => {
            res.status(400).send({
                errorMessage: error.toString()
            });
        });
});

const port = 3000;
app.listen(port, () => {
    console.log('Listening on port ' + port);
});
