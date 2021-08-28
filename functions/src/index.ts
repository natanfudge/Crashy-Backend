import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

admin.initializeApp();

const maxSize = 100_000;

exports.uploadCrash = functions.region("europe-west1").https.onRequest(async (req, res) => {
    if (req.headers["content-encoding"] === "gzip") {
        res.status(415).send("Don't specify gzip as the content-encoding. This trips up the server.");
        return;
    }
    if (req.headers["content-type"] !== "application/gzip") {
        res.status(415).send("log must be compressed using gzip");
        return;
    }

    const body: Buffer = req.body;

    if (body.length > maxSize) {
        res.status(413).send("Crash Log too large");
        return;
    }
    console.log(`Writing about ${body.length / 1000}KB of log`);
    const uploadDate = new Date();
    const writeResult = await admin.firestore().collection("crashes").add({
        uploadDate: uploadDate,
        lastRead: uploadDate,
        log: body
    });
    console.log("Wrote crash log with id " + writeResult.id);

    res.json({
        crashId: writeResult.id,
        crashUrl: `https://crashy.net/${writeResult.id}`
    });
});

exports.getCrash = functions.region("europe-west1").https.onRequest(async (req, res) => {
    if (!req.url || req.url === "") {
        res.status(400).send("No crashlog ID specified");
        return;
    }

    const id = req.url.slice(1);

    const document = admin.firestore().doc(`crashes/${id}`);
    const data = (await document.get()).data();

    if (!data) {
        res.status(404).send(`No crashlog with id ${id}`);
        return;
    }

    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Last-Modified", data["uploadDate"].toDate().toUTCString());
    res.setHeader("Cache-Control", "public,max-age=604800");

    const log = data["log"];
    res.send(log);

    //  Update the last read time only after responding because this operation might be slow
    await document.set({
        lastRead: new Date(),
        ...data
    });
});
