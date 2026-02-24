export const actions = {
        none : (object) => {
            // DON'T DO ANYTHING
            },
        playSound: (object) => {
            // Code pour jouer un son
            console.log("Son lancé !");
            console.log(object);
        },
        changeScene: (object) => {
            // Code pour changer de scène
            console.log("Scène changée !");
            console.log(object);
        },
        animation: (object) => {
            // Code pour activer une animation
            console.log("Animation déclenchée !");
            console.log(object);
        },
        startDialogue: (object) => {
            // Code pour commencer un dialogue
            console.log("Commencer un dialogue");
            console.log(object);
        },
        displayAsset: (object) => {
            // Code pour afficher un asset
            console.log("afficher un asset");
            console.log(object);
        }
};


