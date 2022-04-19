// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
// Example By https://github.com/mcphee11

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
admin.initializeApp();
const firestore = admin.firestore();
const messaging = admin.messaging();

// Automatically allow cross-origin requests
app.use(cors({origin: true}));

// Webhook to receive messages from Genesys
app.post("/messages", (req, res) => {
  try {
    if (req.body.type === "Receipt") {
      console.log(`ReceiptId: ${req.body.id} Status: ${req.body.status}`);
      // 200 OK Response setup
      res.contentType("application/json");
      res.statusCode = 200;
      res.end();
    } if (req.body.type === "Text" && req.body.text != undefined) {
      console.log(JSON.stringify(req.body));
      console.log(`Id: ${req.body.channel.to.id}`);
      firestore.collection(`/users/${req.body.channel.to.id}/messages`).add({
        direction: req.body.direction,
        type: req.body.type,
        message: req.body.text,
        time: Date.now(),
        userId: req.body.channel.to.id,
        attachment: "",
        filename: "",
        url: "",
        richMedia: false,
      }).then((ref) => {
        console.log("Added document with ID: ", ref.id);
        // 200 OK Response setup
        res.contentType("application/json");
        res.statusCode = 200;
        res.write(JSON.stringify({
          "documentId": ref.id,
        }));
        res.end();
        // sending firebase message notification to specific device
        // eslint-disable-next-line max-len
        firestore.doc(`users/${req.body.channel.to.id}/profile/userInfo`).get().then((owner)=>{
          // eslint-disable-next-line max-len
          console.log("Owner: ", owner._fieldsProto.tokens.arrayValue.values[0].stringValue);
          messaging.sendToDevice(
              // eslint-disable-next-line max-len
              [owner._fieldsProto.tokens.arrayValue.values[0].stringValue], // ['token_1', 'token_2', ...]
              {
                data: {
                  owner: JSON.stringify(owner),
                  messageText: JSON.stringify(req.body.text),
                  messageTitle: "Message",
                },
              },
              {
              // Required for background/quit data-only messages on iOS
                contentAvailable: true,
                // Required for background/quit data-only messages on Android
                priority: "high",
              }
          ).then(()=> {
            console.log("done notification");
          });
        });
      });
    } if (req.body.type === "Text" && req.body.text == undefined) {
      console.log(JSON.stringify(req.body));
      console.log(`Id: ${req.body.channel.to.id}`);
      firestore.collection(`/users/${req.body.channel.to.id}/messages`).add({
        direction: req.body.direction,
        type: req.body.content[0].attachment.mediaType,
        message: req.body.content[0].attachment.url,
        time: Date.now(),
        userId: req.body.channel.to.id,
        attachment: "",
        filename: "",
        url: "",
        richMedia: false,
      }).then((ref) => {
        console.log("Added document with ID: ", ref.id);
        // 200 OK Response setup
        res.contentType("application/json");
        res.statusCode = 200;
        res.write(JSON.stringify({
          "documentId": ref.id,
        }));
        res.end();
        // sending firebase message notification to specific device
        // eslint-disable-next-line max-len
        firestore.doc(`users/${req.body.channel.to.id}/profile/userInfo`).get().then((owner)=>{
          // eslint-disable-next-line max-len
          console.log("Owner: ", owner._fieldsProto.tokens.arrayValue.values[0].stringValue);
          messaging.sendToDevice(
              // eslint-disable-next-line max-len
              [owner._fieldsProto.tokens.arrayValue.values[0].stringValue], // ['token_1', 'token_2', ...]
              {
                data: {
                  owner: JSON.stringify(owner),
                  messageText: "Attachment",
                  messageTitle: "Message",
                },
              },
              {
              // Required for background/quit data-only messages on iOS
                contentAvailable: true,
                // Required for background/quit data-only messages on Android
                priority: "high",
              }
          ).then(()=> {
            console.log("done notification");
          });
        });
      });
    } else {
      // Do Nothing
    }
  } catch (ex) {
    console.error(ex);
    // Error Response setup
    res.contentType("application/json");
    res.statusCode = 500;
    res.write(JSON.stringify({
      "error": ex,
    }));
    res.end();
  }
});

// Expose Express API as a single Cloud Function:
exports.outboundwebhook = functions.https.onRequest(app);

// Function for Firestore listening
exports.firestoremonitoring = functions.firestore
    .document("/users/{userId}/messages/{messageId}")
    .onCreate((snap, context) => {
      const newValue = snap.data();
      if (newValue.direction === "Inbound") {
        // Genesys Cloud SDK part
        const platformClient = require("purecloud-platform-client-v2");
        const {v4: uuidv4} = require("uuid");
        const client = platformClient.ApiClient.instance;
        const capi = new platformClient.ConversationsApi();

        const clientId = process.env.CLIENTID; // OAuth2
        const clientSecret = process.env.CLIENTSECRET;
        const region = process.env.REGION; // eg: mypurecloud.com.au
        const integrationId = process.env.INTEGRATIONID;

        client.setEnvironment(region);
        client.setPersistSettings(false, "_mm_");
        // client.config.refresh_token_wait_max = 20;

        if (!clientId) {
          console.error("Missing CLIENTID"); process.exit();
        }
        if (!clientSecret) {
          console.error("Missing CLIENTSECRET"); process.exit();
        }
        if (!region) {
          console.error("Missing REGION"); process.exit();
        }
        if (!integrationId) {
          console.error("Missing INTEGRATIONID"); process.exit();
        }
        console.log("Logging in to Genesys Cloud");
        client.loginClientCredentialsGrant(clientId, clientSecret).then(()=> {
          // Do authenticated things
          if (newValue.attachment === "") {
            // No Attachment just string
            console.log(JSON.stringify(newValue.message));
            console.log("sending...");
            const time = new Date();
            const body = {
              "id": uuidv4(),
              "channel": {
                "platform": "Open",
                "type": "Private",
                "messageId": uuidv4(),
                "to": {
                  "id": integrationId,
                },
                "from": {
                  "nickname": newValue.nickname,
                  "id": newValue.userId,
                  "idType": "email",
                  "image": newValue.image,
                  "firstName": newValue.firstName,
                  "lastName": newValue.lastName,
                },
                "time": time.toISOString(),
              },
              "type": newValue.type,
              "text": newValue.message,
              "direction": "Inbound",
            };
            capi.postConversationsMessagesInboundOpen(body).then(() =>{
              console.log("success");
            });
          } if (newValue.attachment != "") {
            // Image type
            console.log(JSON.stringify(newValue.message));
            // eslint-disable-next-line max-len
            const mime = newValue.attachment.toLowerCase() + "/" + newValue.filename.slice(-3);
            console.log("sending...");
            const time = new Date();
            const body = {
              "id": uuidv4(),
              "channel": {
                "platform": "Open",
                "type": "Private",
                "messageId": uuidv4(),
                "to": {
                  "id": integrationId,
                },
                "from": {
                  "nickname": newValue.nickname,
                  "id": newValue.userId,
                  "idType": "email",
                  "image": newValue.image,
                  "firstName": newValue.firstName,
                  "lastName": newValue.lastName,
                },
                "time": time.toISOString(),
              },
              "type": newValue.type,
              "text": newValue.message,
              "direction": "Inbound",
              "content": [{
                "contentType": "Attachment",
                "attachment": {
                  "mediaType": newValue.attachment,
                  "url": newValue.url,
                  "mime": mime,
                  "filename": newValue.filename,
                },
              }],
            };
            capi.postConversationsMessagesInboundOpen(body).then(() =>{
              console.log("success");
              console.log(JSON.stringify(body));
            });
          }
        })
            .catch((err) => {
              // Handle failure response
              console.error(err);
            });
      } else {
        // Do Nothing not Inbound
      }
    });
