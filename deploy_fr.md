# Instruction de déploiement

Ce document décrit la procédure de déploiement sur un serveur linux (debian) en utilisant Apache

## Prérequis
Vous aurez besoin d'un serveur linux qui répond aux exigences suivantes :
- Node.js est installé avec le gestionnaire de packages npm
- Un serveur web Apache est installé
- Mkcert est installé ou vous disposez d'un certificat SSL présent sous la forme de deux fichiers : `certificate.crt` et `privatekey.key`

Dans la suite, nous considérerons qu'il existe un utilisateur 'webadmin' sur le serveur linux. 


## Instructions

### Téléchargement des fichiers sur le serveur
Clonez les fichiers sur le serveur en utilisant la commande `git clone`
Ici, nous considérerons que les fichiers ont été clonés dans `/home/webadmin/hera`



### Création d’un certificat SSL
**NB** : cette étape n’est nécessaire que si vous ne disposez pas encore d’un certificat SSL. Comme le certificat sera auto-signé, l’utilisateur devra l’accepter manuellement lors de l’avertissement affiché par son navigateur.

Le certificat SSL peut être généré facilement avec **mkcert**. Une fois **mkcert** installé, il vous suffira d’exécuter les commandes suivantes :
```shell
mkcert -install
cd hera/backend/api
mkcert -cert-file certificate.crt -key-file privatekey.key localhost
```



### Configuration des fichiers
Pour fonctionner correctement, certains fichiers doivent être modifiés en fonction de la configuration de votre serveur.
Vous aurez besoin de connaitre les informations suivantes :
- le nom d'hote du serveur web (l'adresse à laquelle le site sera accessible)
- l'emplacement des fichiers `certificate.crt` et `privatekey.key`
- le port sur lequel sera lancé l'API


Dans la suite du document, les valeurs suivantes seront utilisées :
- nom d'hote : `https://hera.univ-lyon1.fr`
- l'emplacement des fichiers du certificat :
  - `/home/webadmin/certificate/certificate.crt`
  - `/home/webadmin/certificate/privatekey.key`
- port API : `8080`

Assurez-vous de connaitre ces informations avant de continuer.



#### Définition du port
```shell
cd hera
nano ./backend/api/app.js
```
Modifier la ligne 47 pour utiliser la valeur de votre choix pour le port utilisé par l'API, puis enregistrez les modifications :
```javascript 
https.createServer(options, app).listen(8080, () => {
    console.log('Server started on port 8080')
})
```

Modifiez également les lignes 26 et 27 pour indiquer le chemin d'accès des fichiers du certificat :
```javascript
const options = {
    key: fs.readFileSync('/home/webadmin/certificate/privatekey.key'),
    cert: fs.readFileSync('/home/webadmin/certificate/certificate.crt')
};
```



#### Modification de la configuration du site
Vous devez maintenant modifier le fichier de configuration du site pour lui indiquer de communiquer avec l'API sur le port que vous avez défini.
```shell
nano ./frontend/user/src/js/endpoint.js
```
Modifiez les lignes 4 et 12 pour inclure le port que vous avez défini :
```javascript
export const ENDPOINT = `${HOST}:8080/api/`;
...
const RESOURCES_SERVER = `${HOST}:8080/`;
```
Modifiez également la deuxième ligne pour indiquer l'adresse du serveur :
```javascript
const HOST = 'https://hera.univ-lyon1.fr';
```

Répétez les étapes ci-dessus pour l'éditeur, en modifiant le fichier `./frontend/admin/src/js/endpoint.js`




### Préparation de l'API
Une fois tous les fichiers configurés, l'API va pouvoir être démarré.
Par convention, les sites internets sont généralement placés dans le dossier `/var/www/`.
Pour des raisons de simplicité, nous allons également stocker l'API a cet endroit.

```shell
cd /var/www
mkdir hera
cd hera
cp -r /home/webadmin/hera/backend/api ./backend
```
Remarque : la création du dossier peut nécessiter les droits admins. Dans ce cas, assurez-vous d'accorder l'accès au dossier à l'utilisateur webadmin avec la commande `chown`, et de définir les autorisations suffisantes avec `chmod`

#### Installation
Depuis le dossier créé précédemment, lancez l'installation des dépendances :
```shell
cd backend
npm install
```
À présent, vous pouvez démarrer l'API :
```shell
npm run start
```
Assurez-vous du bon fonctionnement de l'API en effectuant une requête de test, en accédant à https://hera.univ-lyon1.fr:8080/api/dev/hello


#### Création d'un service
Actuellement, l'API ne fonctionne qu'après avoir exécuté la commande `npm run start`.
Pour assurer son fonctionnement en permanence, nous allons créer un service qui s'exécute automatiquement.
```shell
cd /etc/systemd/system
nano hera.service
```
Insérez le code suivant dans le fichier, puis sauvegardez :
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
Enfin, démarrez le service :
```shell
sudo systemctl start hera.service
```
L'API devrait fonctionner de nouveau, comme lorsqu'il a été lancé manuellement.





### Mise en ligne avec Apache
Une fois l'API en place, nous allons mettre en ligne les deux sites web avec Apache.

#### Copie des fichiers

```shell
cd /home/webadmin/hera/frontend/user
```

Comme pour l'API, il est nécessaire d'installer les dépendances :
```shell
npm install
```
Le site étant basé sur le Framework Vue.js, il doit être compilé dans un fichier html statique :
```shell
npm run build
```
Après l'exécution de cette commande, un dossier `build` sera créé. Copiez-y le fichier `.htaccess` (ce fichier est nécessaire pour permettre à Vue.js de gérer correctement les URLs) :
```shell
cp .htaccess ./build
```

À présent, le dossier `build` continent tous les fichiers statiques pouvant être hébergés par Apache.
Comme convenu plus tôt, nous allons stocker ces fichiers dans le dossier `/var/www`
```shell
cp -r ./build /var/www/hera/frontend/viewer
```
Remarque : pour assurer le fonctionnement du fichier `.htaccess`, le dossier destination doit être nommé `viewer` pour le site de visualisation, et `editor` pour le site d'édition.


Répétez les étapes précédentes (la section 'Copie des fichiers') pour le site d'édition, c'est-à-dire depuis le dossier `/home/webadmin/hera/frontend/admin`.
Assurez-vous de copier le build vers `/var/www/hera/frontend/editor`.


#### Configuration Apache
La dernière étape consiste à créer le fichier de configuration Apache nécessaire à la mise en ligne des deux sites copiés précédemment.
Un template de configuration est fourni dans les fichiers.
```shell
cd '/home/webadmin/hera/apache configs'
nano apache.conf
```
Éditez-le pour modifier les informations suivantes :
```
<VirtualHost *:443>
        ServerAdmin webmaster@localhost

        DocumentRoot /var/www/hera/frontend                    <-- chemin vers la racine du site

        <Directory /var/www/hera/frontend>                     <-- chemin vers la racine du site
                Options FollowSymLinks
                AllowOverride All
                Require all granted
        </Directory>

       
        ErrorLog ${APACHE_LOG_DIR}/error.log
        CustomLog ${APACHE_LOG_DIR}/access.log combined

        SSLEngine on

        SSLCertificateFile      /home/webadmin/certificate/certificate.crt        <-- chemin vers les fichier .crt du certificat
        SSLCertificateKeyFile   /home/webadmin/certificate/privatekey.key         <-- chemin vers les fichier .key du certificat
        <FilesMatch "\.(?:cgi|shtml|phtml|php)$">
                SSLOptions +StdEnvVars
        </FilesMatch>
        <Directory /usr/lib/cgi-bin>
                SSLOptions +StdEnvVars
        </Directory>
</VirtualHost>
```


Sauvegardez les modifications, puis copiez le fichier vers le dossier apache avec un nom explicite :
```shell
cp apache.conf /etc/apache2/sites-available/hera.conf
```

Activez le site avec apache, puis redémarrez le service (généralement en root) :
```shell
a2ensite hera.conf
systemctl restart  apache2.service
```


Le site est maintenant déployé et fonctionnel.
Assurez-vous du bon fonctionnement en accédant au site :
- éditeur : https://hera.univ-lyon1.fr/editor
- visualiseur : https://hera.univ-lyon1.fr/viewer


Vous pouvez supprimer le dossier `/home/webadmin/hera` pour libérer de l'espace.

En cas de problème, il est possible de vérifier les logs :
- `cat /var/log/apache2/error.log` pour les erreurs du site
- `sudo journalctl -u hera` pour les erreurs de l'API