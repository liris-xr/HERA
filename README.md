# HERA

## Introduction

HERA is a no-code AR authoring platform for cultural heritage. It is entirely web-based and does not need any coding abilities. For more informations, check [the paper](https://hal.science/hal-04725966v1) and the [demo video](https://www.youtube.com/watch?v=ZqwUtapg_Bk).

This file is intended to help you configure and start the project for development.

This repository contains all the files required to create 3D scenes and display them in augmented reality.
It is composed of a 3D editing tool to create AR projects, and a viewer to display these projects in augmented reality.
Finally, the editor and the visualization tool access a common database, through an API.

### <ins>Project structure</ins>

The project contains 3 main components:
- Two websites
- **An editing site** (administrator), allowing you to create your own augmented reality projects. The default port is `8080`
- **A visualization site** (user), allowing you to view the projects created from the editor. The default port is `8081`
- An **API**, allowing to connect the two previous sites to a common database. The default port is `3000`

The files are organized according to the following structure:
```
project/
│
├─ backend/
│ ├─ api/
│
├─ frontend/
│ ├─ admin/
│ ├─ user/
```
- `/backend/api/` contains the code necessary for the API to work
- `/frontend/admin/` contains the code necessary for the AR project editor to work
- `/frontend/user/` contains the code necessary for the AR project viewer site to work

### <ins>Technologies</ins>
The following technologies were used during development:
- [Three.js](https://threejs.org/)
- [WebXR](https://immersiveweb.dev/)
- [Vue.js](https://vuejs.org/)
- [Express.js](https://expressjs.com/)
- [Sequelize](https://sequelize.org/)

<br>

## Installation

### <ins>Prerequisites</ins>
To install and use the project, you will need:
- An IDE suitable for web development (Recommended: [WebStorm](https://www.jetbrains.com/webstorm/))
- [Node.js](https://nodejs.org/) installed on your computer
- An Android smartphone/tablet:
- ARCore compatible ([list of compatible devices](https://developers.google.com/ar/devices))
- with Google Chrome installed (WebXR only works in Chrome).
- [ADB](https://developer.android.com/tools/adb) (Optional)

### <ins>Instructions</ins>
1. If you haven't already, clone this repository with the `git clone` command
2. Switch to the `dev` branch:
```shell
git checkout dev
```

#### Installing the viewer site
1. Navigate to the `frontend/user` folder:
```shell
cd frontend/user
```

2. You should now be in a folder containing all the files required to run the viewer site in AR.
This folder contains notably `package.json`, which contains the list of required dependencies. Run the installation of these dependencies:
```shell
npm install
```
<ins>**Note**</ins>: `npm` must be installed on your computer. If the command doesn't work, check your [Node.js installation](#prerequisites)

3. Once the installation is complete, start the server and test your project:
```shell
npm run dev
```
An https web server will be launched on port `8081`. Check for this message in the console:\
![image](./readme/viteHttps.png)

4. Test your project by accessing the page https://localhost:8081.\
If everything went well, the home page of the site should be displayed <ins>indicating an error</ins>. This is completely normal, the page is trying to retrieve data from the API, which we have not yet configured.\
<ins>**Note**</ins>: Depending on the browser used, you may have to accept security risks. [Details](#bypass-security-restrictions-for-development)

#### Installing the API
1. From the project root, navigate to the `backend/api` folder:
```shell
cd backend/api
```
2. As with the site installation, check for the presence of the `package.json` file, and launch the dependencies installation:
```shell
npm install
```

3. Start the server:
```shell
npm run start
```
The API is now reachable on port `3000`: https://localhost:3000 \
<ins>**Note**</ins>: The first launch may take longer, and you will have to accept the creation of a self-signed certificate.

4. Go to https://localhost:3000/api/dev/hello, and make sure that no errors are displayed.

The project should now be functional. Go back to the site and refresh the page.
The error message should disappear, and the home page should display the default projects contained in the database.
Choose one, then try to display it in augmented reality [from your smartphone](#test-from-an-android-smartphone) (or other compatible device).

#### Installing the editor
Repeat the steps previously performed for the "user" site (reminder below):
1. Go todez to the `frontend/admin` folder:
```shell
cd frontend/user
```

2. Start the installation of these dependencies:
```shell
npm install
```

3. Start the server and test your project:
```shell
npm run dev
```
An https web server will be launched on port `8080`.

4. Test your project by accessing the page https://localhost:8080. \
A login page is displayed. To connect, use the default account:
- email: `admin@gmail.com`
- password: `admin`

<br>

## Advanced configuration

<ins>**Note:**</ins> all operations presented in the "Advanced configuration" section are optional

### <ins>Database / API configuration</ins>
#### Data reset
The API is configured to reset the database at each startup (each time the `npm run start` command is executed).
It is possible to disable this behavior by modifying the `backend/api/app.js` file. Here is an excerpt of its content:

```js
...
async function main () {
await initializeDatabase(true); //force creation of tables
await resetDatabase(); //empty the contents of all tables
await insertDefaults(); //insert default values

app.use(project);
...
```
3 functions are interesting here:
- `initializeDatabase(force)` allows to create the necessary tables
- if `force` is `true`, all tables will be deleted, then recreated
- if `force` is `false`, only tables that do not already exist will be created
- `resetDatabase()` allows to delete the content of all tables (but without deleting the tables, only the content)
- `insertDefaults()` allows to insert default values ​​into the tables, for demonstration purposes.

#### Access to the database
The data contained in the database is accessed through the Sequelize ORM.
By default, a temporary SQLite database is created in memory.
You can customize this behavior by modifying the `backend/api/src/orm/database.js` file.\
Refer to the [official documentation](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/) of Sequelize to help you configure another type of database.

#### Modifying default data
The insertion of default data is done directly from the javascript code.
All inserts are done from a dedicated file: `backend/api/src/orm/defaults/insertDefaults.js`. Here is an excerpt from this file:
```js
export async function insertDefaults() {
const userAdmin = ArUser.create({ //insert into ArUser table
id: 'abc-123',
username: 'myUsername',
email: 'user@email.com',
password: 'myPassword',
});
...
}
```
This file contains the `insertDefaults()` function.
The body of the function can be modified to insert your own values.
Each call to the `create()` function (from Sequelize) corresponds to the insertion of a row into the chosen table.\
[Documentation for creating entities](https://sequelize.org/docs/v6/core-concepts/model-instances/#creating-an-instance)

<ins>**Note**</ins>: Make sure to insert at least one user.
His email and password will be required to access the editor.
The default values ​​are: email: `admin@gmail.com`, password: `admin`.

#### Changing the port
By default, the API can be reached on port `3000`.
It is possible to change this value to start on the port of your choice.
Here is an excerpt from the `backend/api/app.js` file:
```js
https.createServer(options, app).listen(process.env.PORT || 3000, () => {
console.log('Server started on port 3000')
})
```
Replace `3000` with the value of your choice, then restart the API (`npm run start`).

<ins>**Note:**</ins> After changing the port, the editing and viewing sites will still attempt to make requests on port `3000`, resulting in a 404 error.
You must change their destination address in the `frontend/user/src/js/endpoints.js` and `frontend/admin/src/js/endpoints.js` files:
```js
export const ENDPOINT = `${HOST}:3000/api/` //the site will still attempt to make requests on port 3000;
```
Replace `3000` to use the value you chose earlier.

### <ins>Web Server Modifications</ins>

[//]: # (<ins>**Note:**</ins> The operations presented in this part are presented on the viewer site, but the steps can be reproduced with the editor site.)

#### File Server Configuration
For simplicity, resources such as 3D models and images are stored directly on the web server, in the `frontend/user/public/` folder
If you want to use a custom file server, you will need to modify the `frontend/user/src/js/endpoints.js` and `frontend/admin/src/js/endpoints.js` :
```js
const RESOURCES_SERVER = `${HOST}:8081/public`; //by default, resources are fetched from https://localhost:8081, which is the default port of the viewer site
```
You can change the URL to change the location from which the files are loaded.

#### Changing the ports
The Vite server is launched by default on ports `8080` and `8081` for the editing and viewer sites.
It is possible to change these values, by editing the `package.json` files for each of the two sites.
Here is a snippet:
``` js
...
"scripts": {
"dev": "vite --host --port 8080", //change the port here
"build": "vite build",
...
```
The port can be changed by changing the `--port ` option of the `dev` script.
Make sure to use a free port, and not to use the same port for both sites.

<ins>**Note:**</ins> If you decide to change the port of the viewer site, you will need to [change the resource path](#file-server-configuration) for the editor, which fetches resources on port `8081` by default.

<br>

## Development Help and Tips

### <ins>Starting a WebXR Session</ins>
WebXR is the technology used for augmented reality. It allows you to access the camera and track its movements.
This technology works under certain conditions:
- The browser used is Google Chrome
- The device is compatible with augmented reality
- The site uses a secure connection (`https`)

<ins>**Note:**</ins> the `localhost` address is the only exception, which can work in `http` mode. Examples:
```shell
http://localhost:8081 # WebXR can work ✔
https://localhost:8081 # WebXR can work ✔

https://192.168.1.32:8081 # WebXR can work ✔
http://192.168.1.32:8081 # WebXR cannot work ❌

https://my-website.com # WebXR can work ✔
http://my-website.com # WebXR cannot work ❌
```

### <ins>Bypassing security restrictions for development</ins>
Starting a WebXR session requires a secure connection (`https`).
The project therefore includes a plugin to start the Vite server in `https` mode using a self-signed certificate.
This plugin is for development use only, and should be removed when going live.\
By default, browsers do not trust self-signed certificates, and block access to the site.
You can resolve this issue by trying one of the two methods below:

#### Accepting the security risks
![image](./readme/httpsWarning.png)\
You should see this message if you are trying to access the site for the first time.
To continue, simply click "Continue to site" (after expanding the "Advanced settings" section)\
However, the site should still display an error even after accepting the risk:
![image](./readme/fetchFail.png)\
This is because the browser is trying to fetch data from the API, which is not considered a secure resource.
The only solution to solve this problem is to manually make a request to the API, and click on "Continue to the site" (as in the previous step)\
[Click here to make a request on the default port](https://localhost:3000/api/dev/hello)\
After this step, go back to the site and refresh the page. The problem should be solved.

#### Disable the https plugin
This method consists of removing the `vite-plugin-mkcert` plugin to start the server in normal mode (`http`).
This allows to remove the security warnings, but it will no longer be possible to start a WebXR session (except locally, [Details here](#starting-a-webxr-session)).
Changes are needed to the code of both sites, and the API:

- For both websites:
- Access the `frontend/user/vite.config.js` and `frontend/admin/vite.config.js` files.
Here is an excerpt of their content:
```js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mkcert from "vite-plugin-mkcert"; //delete this line

// https://vitejs.dev/config/
export default defineConfig({
plugins: [
vue(),
mkcert(), //delete this line
],
...
})
```
- Here, two lines concern the `mkcert` plugin. Delete (or comment out) these lines, then restart the server (`npm run dev`).
Check the message in the console:\
![image](./readme/viteHttp.png)\
The server is now running in `http` mode. Repeat the previous steps for the second site.
- To completely uninstall the plugin (optional):
```shell
npm uninstall vite-plugin-mkcert
```

- For the API:\
On the contraryt to both websites, the API is not started using the Vite server.
So the plugin is not available, and the steps are different:
- Go to the `backend/api/app.js` file. Here is an excerpt of its content:
```js
...
import cors from 'cors'

//for https only : //
import * as fs from "node:fs"; //
import * as https from "node:https"; //
const options = { // Remove these lines
key: fs.readFileSync('privatekey.key'), //
cert: fs.readFileSync('certificate.crt') //
}; //

...

async function main () {
...
https.createServer(options, app).listen(process.env.PORT || 3000, () => { //modify this line
console.log('Server started on port 3000')
})
}
```
- Two important modifications are to be made:
1. Delete the lines indicated by the comment concerning `https`.
2. Modify the `main()` function: replace `https.createServer(options, app)` with `app`, to get the following result:
```js
app.listen(process.env.PORT || 3000, () => {
console.log('Server started on port 3000')
})
```
- Restart the API (`npm run start`), and test a request in `http`, for example http://localhost:3000/api/dev/hello

<ins>**Note:**</ins> After changing the `http` mode, the editing and viewing sites will still try to make requests to the API in `https` mode, resulting in an error.
You need to change their destination address in the `frontend/user/src/js/endpoints.js` and `frontend/admin/src/js/endpoints.js` files:
```js
const HOST = 'https://localhost'; //the site always tries to make requests in https mode;
```
Change the value of `HOST` to obtain an `http` address, for example `http://localhost`

If you still can't get the site to work after applying one of the 2 methods above, try from another browser.
Note however that it is necessary to use Chrome to launch augmented reality, other browsers will be displayed as incompatible.

### <ins>Test from an Android smartphone</ins>
To test your projects in augmented reality, you will need to access the visualization site from an Android smartphone (or other compatible device).
There are two possible methods:

#### Remote access
In this project, Vite is configured to launch a server accessible on the network (thanks to the `--host` option).
You can see this by looking at the message displayed in the console at the time of launch:\
![image](./readme/viteHttps.png)\
Here, the server is accessible from a browser, by two possible addresses:
- `https://localhost:8081`
- `https://192.168.139.116:8081` (the IP can be different)

In this case, make sure that the Android phone is connected to the same Wi-Fi network as the PC on which the server was launched,
then simply access the site by entering its remote URL (the one with the IP) in a browser (from the phone).

The site should appear by displaying a loading error. This is because it tries to fetch data from the API at `https://localhost`, which is not reachable from the phone.
So you need to edit the `frontend/user/src/js/endpoints.js` and `frontend/admin/src/js/endpoints.js` files, so that the value of `HOST` is changed to include the PC IP, for example:
```js
const HOST = 'https://192.168.139.116'; //use the server PC IP
```

#### Local Access
This method is to expose the PC's local ports to make them accessible to Android devices connected by cable.
This method is recommended for development and debugging sessions. It takes more time to set up, but offers several advantages:
- You don't need to use an `https` connection
- You will be able to access the phone's javascript console

However, the phone must remain plugged in permanently to maintain the connection.

- Make sure you have installed ADB on your computer, and enabled USB debugging on your phone ([Tutorial here](https://www.xda-developers.com/install-adb-windows-macos-linux/)).
- Connect your phone to the PC.
- In a terminal, enter the command `adb devices`, and make sure your phone appears in the list (see tutorial)
- Enter the following command:
```shell
adb reverse tcp:8081 tcp:8081
```
This command exposes the local port `8081` of the PC through the port `8081` of the phone.
Start over with ports `8080` and `3000` (or whatever ports you used).
- On the phone, go to https://localhost:8081 in a browser. The site should workctionner.

After applying one of the two previous methods, you will be able to test augmented reality on your Android phone, provided you use the Google Chrome browser.

### Other tips and remarks

#### Access the phone's javascript console
During development, you will regularly need to check for errors caused by augmented reality directly in the phone's javascript console.
It is possible to access it provided you use Google Chrome on the PC and on the phone:
- Make sure you have followed [these instructions](#local-access) (your phone must be connected to the PC...)
- From the PC, go to [chrome://inspect/#devices](chrome://inspect/#devices) (from the Chrome browser)
- After a few seconds, the list of tabs open on the phone should appear.
Find the tab you are interested in, then click on 'inspect'
- A new window opens, from which you can interact with the site, and access the console.

#### Troubleshooting performance issues
The Vite server uses a "hot reload" system, which automatically reloads the page as soon as the source code is changed.
This system is convenient for development, but can cause performance issues, since the 3D models used are also reloaded, without freeing the memory used by the previous ones.
If you encounter performance issues, consider manually reloading the page to clear the memory.

#### Fixing loading errors

If you cannot load the website, or if it displays an error, check the messages in the console.\
A common error is `ERR_CERT_AUTHORITY_INVALID`, which indicates that the browser is trying to access a resource considered untrusted. Follow [these instructions](#accept-the-security-risks) to fix the issue.\

Also, consider checking the contents of the `frontend/user/src/js/endpoints.js` and `frontend/admin/src/js/endpoints.js` files, which contain the network addresses used to communicate with the API.
Loading errors are usually caused by a misconfiguration of this file.
