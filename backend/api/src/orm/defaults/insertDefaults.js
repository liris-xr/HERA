import {ArUser, ArProject, ArScene, ArAsset} from "../index.js";
import ArLabel from "../models/arLabel.js";
import {passwordHash} from "../../utils/passwordHash.js";

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
const demo_images_host = "https://172.22.69.22:8080/public/files/bee2728b-b74c-4501-90c1-e387294a86fb/images/";


export async function insertDefaults() {
    const userAdmin = ArUser.create({
        id: '3e6d3402-8a53-4354-bc63-647ee1b6a59b',
        username: 'admin',
        email: 'admin@gmail.com',
        admin: true,
        password: passwordHash('admin'),
    });



    const adminProject2 = await ArProject.create({
        id: 'bee2728b-f99s-4501-90c1-e387294a86fb',
        published: false,
        title: "Autre projet",
        description: "D'autres projets sont possibles ! Le site n'est pas limité à une seule maquette. Ce projet peut par exemple être dédié à l'évolution d'un bâtiment en particulier.",
        unit: "Couleur",
        calibrationMessage: "Appuyer n'importe où pour placer votre objet",
        userId: '3e6d3402-8a53-4354-bc63-647ee1b6a59b'
    });

    await sleep(1000)
    const adminProject = await ArProject.create({
        id: 'bee2728b-b74c-4501-90c1-e387294a86fb',
        published: true,
        title: "Maquette musée des Soieries",
        description: "Le musée des Soieries Bonnet se trouve dans l'ancienne usine de l'entreprise Bonnet à Jujurieux. De 1835 à 2001, ce site a produit différents textiles (en pariculier de la soie). En devenant musée, on a pu préserver les collections, les bâtiments, et aussi le savoir-faire de cette industrie. Le musée possède un fonds exceptionnel de plus de 300 000 objets présents dans les bâtiments d'origine, et que tu peux admirer au travers de cette maquette numérique.",
        pictureUrl: "public/files/bee2728b-b74c-4501-90c1-e387294a86fb/images/cover1720533869014.jpg",
        unit: "Année",
        calibrationMessage: "Appuyer n'importe où pour afficher la maquette",
        userId: '3e6d3402-8a53-4354-bc63-647ee1b6a59b'
    });


    const adminProjectScene1 = await ArScene.create({
        id: '81c50d21-25f6-4db8-aaaa-234527b69bc0',
        title: '1834',
        projectId: 'bee2728b-b74c-4501-90c1-e387294a86fb',
        description: "L'histoire commence en 1834, où Claude Bonnet fait l'acquisition d'une maison bourgeoise, accompagnée des ses dépendances et d'un grand terrain",
        index: 0
    });

    const adminProjectScene2 = await ArScene.create({
        id: '48b509d9-d21e-4ba5-8d53-eae1eabfd75b',
        title: '1845',
        projectId: 'bee2728b-b74c-4501-90c1-e387294a86fb',
        description: "Il y fait construire de nouveaux bâtiments jusqu'en 1845. À ce moment, le site est déjà capable de produire de grande quantités de soie, mais la croissance ne fait que commencer...",
        index: 1
    });

    const adminProjectScene3 = await ArScene.create({
        id: '487f3cd4-b56c-4150-92eb-f71ac81ffa75',
        title: '1870',
        projectId: 'bee2728b-b74c-4501-90c1-e387294a86fb',
        description: "Les premiers ouvriers à avoir travaillé aux usines Bonnet de Jujurieux sont des ouvrières appelées « pensionnaires ». Découvre leur quotidien en appuyant sur le bouton play en bas à droite de l'écran.",
        index: 2
    });


    const asset1 = await ArAsset.create({
        id: '042e5b23-7d95-406c-a54a-ca70db7cf2e3',
        url: 'public/files/bee2728b-b74c-4501-90c1-e387294a86fb/assets/asset17205338690140.glb',
        name: '1834.glb',
        sceneId: '81c50d21-25f6-4db8-aaaa-234527b69bc0'
    });


    const asset2 = await ArAsset.create({
        id: '52a0439d-7c61-4c18-9fca-16bd75d05cbd',
        url: 'public/files/bee2728b-b74c-4501-90c1-e387294a86fb/assets/asset17205338690141.glb',
        name: '1845.glb',
        sceneId: '48b509d9-d21e-4ba5-8d53-eae1eabfd75b'
    });

    const asset3 = await ArAsset.create({
        id: '9ee09939-95b1-4d20-bc4f-c6e898eac56c',
        url: 'public/files/bee2728b-b74c-4501-90c1-e387294a86fb/assets/asset17205338690142.glb',
        name: '1870.glb',
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });


    const labelScene3_1 = await ArLabel.create({
        id: 'bbb2bca7-3224-48da-a0c3-2b7e2a36b584',
        position: {"x": -0.21489120689924243, "y": 0.14627271364429353, "z": -0.5102086835890118},
        text: "<img src=\""+demo_images_host+"img1720533869019.png\" alt=\"img\" style=\"width: 100%\"> <p>Les pensonnaires sont des jeunes filles (entre 13 et 20 ans) qui travaillent à la préparation des fils de soie (filature + moulinage). Comme leur nom l'indique, elles vivent sur le site. Leur quotidien est partagé entre le travail à l'usine et la vie au pensionnat.</p> <iframe src=\"/assets/project/audio.mp3\" allow=\"autoplay\" style='display: none'></iframe>",
        timestampStart: 1000,
        timestampEnd: 8000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    /*
    <audio autoPlay preload='auto' controls>
        <source src="/assets/project/audio.mp3" type="audio/mpeg"/>
        Your browser does not support the audio element.</audio>

    <iframe src="/assets/project/audio.mp3" allow="autoplay"></iframe>*/
    const labelScene3_2 = await ArLabel.create({
        id: 'e5f5ad28-ceb3-4b12-b817-91eacb3120ae',
        position: {"x": -0.21395685784430915, "y": 0.14428607270691834, "z": -0.5099197471725173},
        text: "<h2>5h00 - 5h40</h2> <p>Réveil et café au pensionnat</p>",
        timestampStart: 8000,
        timestampEnd: 12000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_3 = await ArLabel.create({
        id: '71b7c633-8d35-4812-a519-48a8bdc643fc',
        position: {"x": -0.2094429658937141, "y": 0.03858790690100975, "z": -0.4720492673551239},
        text: "<h2>6h00</h2> <img src=\""+demo_images_host+"img1720533869018.png\" alt=\"img\" style=\"width: 100%\"> <p>Sortie du pensionnat. Les ouvrières se dirrigent vers leur lieu de travail</p>",
        timestampStart: 12000,
        timestampEnd: 16000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });


    const labelScene3_4 = await ArLabel.create({
        id: '196a0823-5670-4cec-9cfd-99215d8d9d41',
        position: {"x": -0.49286627720905796, "y": 0.19039767577046013, "z": -0.2675729058486698},
        text: "<h2>6h00 - 19h00</h2>     <img src=\""+demo_images_host+"img1720533869021.png\" alt=\"img\" style=\"width: 100%\">     <p>Certaines ouvrières travaillent à l'atelier de moulinage</p>",
        timestampStart: 16000,
        timestampEnd: 24000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_5 = await ArLabel.create({
        id: '12a21292-a6ba-4a9f-b5e6-2d332663ed15',
        position: {"x": -0.3283896279700032, "y": 0.16386768413392627, "z": 0.1543917637701666},
        text: "<h2>6h00 - 19h</h2> <img src=\""+demo_images_host+"img1720533869022.png\" alt=\"img\" style=\"width: 100%\"> <p>D'autres vont à l'atelier de tissage</p>",
        timestampStart: 20000,
        timestampEnd: 24000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });


    const labelScene3_6 = await ArLabel.create({
        id: '1dde6446-0216-41bb-9d15-99c4116577cf',
        position: {"x": 0.16015580215545883, "y": 0.12825367754646322, "z": 0.036562552542710916},
        text: "<img src=\""+demo_images_host+"img1720533869017.png\" alt=\"img\" style=\"width: 100%\"> <p>Les ouvrières travaillent 11h par jour. En cas de problème, elles peuvent se rendre à l'infirmerie</p>",
        timestampStart: 24000,
        timestampEnd: 30000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_7 = await ArLabel.create({
        id: '546474dc-0498-4fb6-b5d1-4f954e56554f',
        position: {"x": -0.21513652846980857, "y": 0.14527367759473336, "z": -0.505120763624475},
        text: "<p>Des pauses repas sont organisées régulièrement :</p> <ul>     <li>8h30 : petit déjeuner</li>     <li>12h00 : pause diner</li>     <li>16h00 : pause goûter</li> </ul>",
        timestampStart: 30000,
        timestampEnd: 36000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_8 = await ArLabel.create({
        id: 'fc3a7ce2-d260-4cb6-85e5-8fbeca24957e',
        position: {"x": 0.010159509006652929, "y": 0.050822096361347546, "z": 0.07922896356551723},
        text: "<img src=\""+demo_images_host+"img1720533869020.png\" alt=\"img\" style=\"width: 100%\"> <p>Le soir, les ouvrières retournent au pensionnat ou vont profiter de leur temps libre</p>",
        timestampStart: 36000,
        timestampEnd: 40000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_9 = await ArLabel.create({
        id: 'de2626d5-e52d-4dcb-959d-da709f90d87d',
        position: {"x": 0.2032504270699614, "y": 0.03471952448255418, "z": -0.11373036762109905},
        text: "<img src=\""+demo_images_host+"img1720533869015.png\" alt=\"img\" style=\"width: 100%\">",
        timestampStart: 40000,
        timestampEnd: 48000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_10 = await ArLabel.create({
        id: '76618760-c2a8-4824-bdbf-3f72bca7544f',
        position: {"x": -0.06845833190936906, "y": 0.10253275541151594, "z": 0.1966693160928878},
        text: "<img src=\""+demo_images_host+"img1720533869016.png\" alt=\"img\" style=\"width: 100%\">",
        timestampStart: 44000,
        timestampEnd: 48000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_11 = await ArLabel.create({
        id: '3239f4a9-6f2a-49fc-9a48-ca07a79c0d27',
        position: {"x": -0.2146897792797725, "y": 0.14570254300079752, "z": -0.5078721108245865},
        text: "<h2>21h00</h2> <p>Les ouvrières vont dormir pour être en forme pour la journée du lendemain.</p> <p>Rappel : le réveil est à 5h00 !</p>",
        timestampStart: 48000,
        timestampEnd: 54000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });
    /*
    const labelScene3_1 = await ArLabel.create({
        id: 'lab03.1',
        position: {x: .02, y: .07, z: .36},
        text: "Maison Bourgeoise",
        timestampStart:1000,
        // timestampEnd:2000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_2 = await ArLabel.create({
        id: 'lab03.2',
        position: {x: -.04, y: .07, z: .77},
        text: "Maison Mme Lacroix",
        timestampStart:2000,
        // timestampEnd:3000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_3 = await ArLabel.create({
        id: 'lab03.3',
        position: {x: .06, y: .06, z: .49},
        text: "Entrepôt",
        timestampStart:3000,
        // timestampEnd:4000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });
    const labelScene3_4 = await ArLabel.create({
        id: 'lab03.4',
        position: {x: .12, y: .06, z: .32},
        text: "Boulangerie",
        timestampStart:4000,
        // timestampEnd:5000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_5 = await ArLabel.create({
        id: 'lab03.5',
        position: {x: .1, y: .06, z: .19},
        text: "Vacher",
        timestampStart:5000,
        // timestampEnd:6000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_6 = await ArLabel.create({
        id: 'lab03.6',
        position: {x: .17, y: .06, z: .16},
        text: "Concierge",
        timestampStart:6000,
        // timestampEnd:7000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_7 = await ArLabel.create({
        id: 'lab03.7',
        position: {x: -.36, y: .05, z: .14},
        text: "Grand bâtiment",
        timestampStart:7000,
        // timestampEnd:8000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_8 = await ArLabel.create({
        id: 'lab03.8',
        position: {x: -.26, y: .04, z: .12},
        text: "Machine à vapeur",
        timestampStart:8000,
        // timestampEnd:9000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });

    const labelScene3_9 = await ArLabel.create({
        id: 'lab03.9',
        position: {x: -.12, y: .07, z: .17},
        text: "Chapelle",
        timestampStart:9000,
        // timestampEnd:10000,
        sceneId: '487f3cd4-b56c-4150-92eb-f71ac81ffa75'
    });
    */

}
