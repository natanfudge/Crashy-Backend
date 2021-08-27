import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

admin.initializeApp();

const app = express();
app.post("/api/upload-crash", async (req, res) => {
    const body = req.body;
    const writeResult = await admin.firestore().collection("crashes").add({
        uploadDate: new Date(),
        log: body
    });

    res.json({
        crashId: writeResult.id,
        crashUrl: `https://crashy.net/${writeResult.id}`
    })
});

app.get("/api/get-crash", async (req, res) => {
    const id = req.query["id"];
    if (!id) return res.status(400).send("No crashlog ID specified")
    const document = await admin.firestore().doc(`crashes/${id}`).get()
    const data = document.data();
    if (!data) return res.status(404).send(`No crashlog with id ${id}`)

    return res.send(data["log"])
})

exports.widgets = functions.region("europe-west1").https.onRequest(app);
