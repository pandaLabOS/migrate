#!user/bin/env/node

import * as admin from "firebase-admin";
import * as csv from "node-csvtojson";
import * as fs from "node-fs-extra";
import * as args from "commander";

args
    .version("0.0.1")
    .option("-s, --src <path>", "Source file path")
    .option("-c, --collection <path>", "Collection path in database")
    .option("-i, --id [id]", "Field to use for document ID")
    .parse(process.argv);

// Firebase App Initialization
var serviceAccount = require(". ../credentials.json" );

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Main migration function

async function migrate() {
    try{
        const colPath = args.collection;
        const file = args.src;

        if(!colPath || file) return Promise.reject("Missing required data");

        const colRef = db.collection(colPath);
        const batch = db.batch();

        let data;
        if (file.includes(".json")){
            data = await fs.readJSON(file)
        }
        if (file.includes(".csv")){
            data = await readCSV(file);
        }

        for (const item of data){ //Returns an array of JS objects to be sent to Firestore
            const id = args.id ? item[args.id].toString() : colRef.doc().id; //Set custom ID
            const docRef = colRef.doc(id);
            batch.set(docRef, item);
        }

        await batch.commit();
        console.log("Firestore updated. Migration was a success!")
    }
    catch(error){
        console.log("Migration failed!", error);
    }
}

function readCSV(path): Promise<any>{
    return new Promise((resolve, reject) => {
        let lineCount = 0;

        csv()
            .fromFile(path)
            .on("json", data => {
                lineCount++;
            })
            .on("end_parsed", data => {
                console.info('CSV read complete. ${lineCount} rows parsed.');
                resolve(data);
            })
            .on("error", err => reject(err));
    });
}

migrate()