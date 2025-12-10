# ⛔️ NO LONGER MAINTAINED ⛔️
In stead I'm now using the MMSDK details can be found [HERE](https://developer.genesys.cloud/commdigital/digital/webmessaging/mobile-messaging/messenger-mobile-sdk/)

[![No Maintenance Intended](http://unmaintained.tech/badge.svg)](http://unmaintained.tech/)

# firebase-openMessaging
This is designed as an example only for using Firebase as the BaaS for Genesys Cloud [OpenMessaging](https://developer.genesys.cloud/commdigital/digital/openmessaging/) to be integrated into a native Mobile App. This repo is the server side of the Middleware and there is another repo I have created that is the client side written as a Flutter/Dart mobile application focusing on Android, but can also be deployed to iOS. This example requires you to have experience with firebase, npm & JavaScript.

Here is the Overview of the design and this repo is to cover the Firebase components, The Fultter app needs to be created after this server side stage.

![](/docs/images/overview.png)

## 1. Create the project

To connect this with your existing Firebase project that is created with functions, firestore, storage and messaging enabled create a new Dir and do your normal:

    firebase init

Then select "Functions" and the rest of the information as well as an existing or new project. The language used is "JavaScript" and I have also used "ESLint", also ensure you install the npm packages when asked.

Once you then have a Dir created you can copy the [index.js]() into your index.js that will be created in the "functions" dir. From this functions dir you will also need to install the additional cnmp package for Genesys Cloud:

    npm install purecloud-platform-client-v2

Once you have done this you can deploy the code to firebase by running the deploy command:

    firebase deploy

in the output you will see the HTTPS URL that gets created for the outboundwebhook function: 

Function URL (outboundwebhook(region)): https://region-projectname.cloudfunctions.net/outboundwebhook

Ensure that the outbound webhook function is set to allow for unauthenticated triggering as this is the endpoint that Genesys Cloud will be configured to send messages to.

## 2. Create the Genesys Cloud connections

On the Genesys Cloud side you will need to create an OpenMessaging integration as well as a Client Credentials OAuth for sending the Inbound messages to from the cloud function. All these details will then need to be saved in a ".env" file that lives in the "function" Dir of the project. First create an OAuth client in Genesys Cloud ensure that you have the required "Roles" for the Inbound messages endpoint the swagger deep link can be found [here](https://developer.genesys.cloud/routing/conversations/conversations-apis#post-api-v2-conversations-messages-inbound-open)

![](/docs/images/oauth.png?raw=true)

Make sure you copy the clientId and secret down as you will need them to update the .env file in a moment.

Now you will need to create the OpenMessaging channel as below, ensure that you use the webhook URL that was output from the function deployment in the above step. ensure that you add the /messages at the end of the URL as that is the endpoint the cloud function is set to listen for.

    https://region-projectname.cloudfunctions.net/outboundwebhook/messages

you can also add a webhook signature token for extra security. If you do this you will need to update the webhook JS to check for it details on thsi can be found [here](https://developer.genesys.cloud/commdigital/digital/openmessaging/validate)

![](/docs/images/createintegration.png?raw=true)

Now that you have created the integration you will need to get its ID. To do this go to the Genesys Cloud Developer centre and use the [API Explorer](https://developer.genesys.cloud/devapps/api-explorer) use the

    GET /api/v2/conversations/messaging/integrations

endpoint to find the ID of the integration you created. Now that you have all ther required configuration elements you can update the .env file that you created in the "functions" dir of the project with the below:


    CLIENTID=YOUR_CLIENTID
    CLIENTSECRET=YOUR_SECRET
    REGION=YOUR_REGION
    INTEGRATIONID=YOUR_INTEGRATIONID

For the "region" there are a list of regions found [here](https://developer.genesys.cloud/platform/api/) for example in the Australian region I enter "mypurecloud.com.au".

## 3. Create the client/Mobile App

For this we will move to the Flutter Repo I have created which can be found [here](https://github.com/mcphee11/flutter-openMessaging)
