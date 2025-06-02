# Deployment Instructions

This document describes the deployment procedure on a Linux (Debian) server using Apache

## Prerequisites
You will need a Linux server that meets the following requirements:
- Node.js is installed with the npm package manager
- An Apache web server is installed
- Mkcert is installed or you have an SSL certificate in the form of two files: `certificate.crt` and `privatekey.key`.

In the following, we will assume that there is a user 'webadmin' on the Linux server.

## Instructions

### Uploading files to the server
Clone the files to the server using the `git clone` command
Here, we will assume that the files have been cloned in `/home/webadmin/hera`

### Create an SSL certificate
**NB** : this step is only necessary if you don't yet have an SSL certificate. As the certificate will be self-signed, users will have to accept it manually when their browser displays a warning.

The SSL certificate can be easily generated with **mkcert**. Once **mkcert** has been installed, simply run the following commands:
```shell
mkcert -install
cd hera/backend/api
mkcert -cert-file certificate.crt -key-file privatekey.key localhost
````

### File configuration
To work properly, some files must be modified according to your server configuration.
You will need to know the following information:
- the hostname of the web server (the address at which the site will be accessible)
- the location of the `certificate.crt` and `privatekey.key` files
- the port on which the API will be launched

In the rest of the document, the following values ​​will be used:
- hostname: `https://hera.univ-lyon1.fr`
- the location of the certificate files:
- `/home/webadmin/certificate/certificate.crt`
- `/home/webadmin/certificate/privatekey.key`
- API port: `8080`

Make sure you know this information before continuing.

#### Port definition
```shell
cd hera
nano ./backend/api/app.js
```
Modify line 47 to use your preferred value for the port used by the API, then save the changes:
```javascript
https.createServer(options, app).listen(8080, () => {
console.log('Server started on port 8080')
})
```

Also modify lines 26 and 27 to specify the path to the certificate files:
```javascript
const options = {
key: fs.readFileSync('/home/webadmin/certificate/privatekey.key'),
cert: fs.readFileSync('/home/webadmin/certificate/certificate.crt')
};
```

#### Editing the site configuration
You now need to edit the site configuration file to tell it to communicate with the API on the port you set.
```shell
nano ./frontend/user/src/js/endpoint.js
```
Edit lines 4 and 12 to include the port you set:
```javascript
export const ENDPOINT = `${HOST}:8080/api/`;
...
const RESOURCES_SERVER = `${HOST}:8080/`;
```
Also edit the second line to indicate the server address:
```javascript
const HOST = 'https://hera.univ-lyon1.fr';
```

Repeat the above steps for the editor, modifying the file `./frontend/admin/src/js/endpoint.js`

### Preparing the API
Once all the files are configured, the API can be started.
By convention, websites are usually placed in the `/var/www/` folder.

For simplicity, we will also store the API there.

```shell
cd /var/www
mkdir hera
cd hera
cp -r /home/webadmin/hera/backend/api ./backend
```
Note: creating the folder may require admin rights. In this case, make sure to grant access to the folder to the webadmin user with the `chown` command, and set sufficient permissions with `chmod`

#### Installation
From the folder created earlier, launch the dependencies installation:
```shell
cd backend
npm install
```
Now, you can start the API:
```shell
npm run start
```
Ensure that the API is working properly by making a test request, by accessing https://hera.univ-lyon1.fr:8080/api/dev/hello

#### Creating a service
Currently, the API only works after running the `npm run start` command.
To ensure its continuous operation, we will create a service that runs automatically.
```shell
cd /etc/systemd/system
nano hera.service
```
Insert the following code into the file, then save:
```
[Unit]
Description=Node.js backend for hera
After=network.target

[Service]
ExecStart=/usr/bin/node /var/www/hera/backend/app.js
WorkingDirectory=/var/www/hera/backend/
Environment=NODE_ENV=production
User=webadmin
Group=webadmin
Restart=always
RestartSec=10
StandardError=syslog
SyslogIdentifier=hera

[Install]
WantedBy=multi-user.target
```
Finally, start the service:
```shell
sudo systemctl start hera.service
```
The API should work again, as it did when it was started manually.

### Uploading with Apache
Once the API is set up, we will upload the two websites with Apache.

#### Copying the files

```shell
cd /home/webadmin/hera/frontend/user
```

As for the API, it is necessary to install the dependencies:
```shell
npm install
```
Since the site is based on the Vue.js Framework, it must be compiled into a static html file:
```shell
npm run build
```
After running this command, a `build` will be created. Copy the `.htaccess` file into it (this file is needed to allow Vue.js to handle URLs properly):
```shell
cp .htaccess ./build
```

Now, the `build` folder contains all the static files that can be hosted by Apache.
As agreed earlier, we will store these files in the `/var/www` folder
```shell
cp -r ./build /var/www/hera/frontend/viewer
```
Note: to ensure the `.htaccess` file works, the destination folder must be named `viewer` for the viewer site, and `editor` for the editor site.

Repeat the previous steps (the 'Copying files' section) for the editor site, i.e. from the `/home/webadmin/hera/frontend/admin` folder.
Make sure to copy the build to `/var/www/hera/frontend/editor`.

#### Apache Configuration
The last step is to create the Apache configuration file needed to put the two sites copied earlier online.
A configuration template is provided in the files.
```shell
cd '/home/webadmin/hera/apache configs'
nano apache.conf
```
Edit it to change the following information:
```
<VirtualHost *:443>
ServerAdmin webmaster@localhost

DocumentRoot /var/www/hera/frontend <-- path to site root

<Directory /var/www/hera/frontend> <-- path to site root
Options FollowSymLinks
AllowOverride All
Require all granted
</Directory>

ErrorLog ${APACHE_LOG_DIR}/error.log
CustomLog ${APACHE_LOG_DIR}/access.log combined

SSLEngine on

SSLCertificateFile /home/webadmin/certificate/certificate.crt <-- path to certificate .crt files
SSLCertificateKeyFile /home/webadmin/certificate/privatekey.key <-- path to the certificate .key files
<FilesMatch "\.(?:cgi|shtml|phtml|php)$">
SSLOptions +StdEnvVars
</FilesMatch>
<Directory /usr/lib/cgi-bin>
SSLOptions +StdEnvVars
</Directory>
</VirtualHost>
```

Save the changes, then copy the file to the apache folder with a meaningful name:
```shell
cp apache.conf /etc/apache2/sites-available/hera.conf
```

Activate the site with apache, then restart the service (usually as root):
```shell
a2ensite hera.conf
systemctl restart apache2.service
```

The site is now deployed and functional. Make sure it works properly by accessing the site:
- editor: https://hera.univ-lyon1.fr/editor
- viewer: https://hera.univ-lyon1.fr/viewer

You can delete the folder `/home/webadmin/hera` to free up space.

In case of problems, it is possible to check the logs:
- `cat /var/log/apache2/error.log` for site errors
- `sudo journalctl -u hera` for API errors