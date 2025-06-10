import * as THREE from "three";
import * as ThreeMeshUI from "three-mesh-ui";

export function createButton(text, buttonOptions={}) {
    const hoveredStateAttributes = {
        state: 'hovered',
        attributes: {
            offset: 0.035,
            backgroundColor: new THREE.Color( 0x999999 ),
            backgroundOpacity: 1,
            fontColor: new THREE.Color( 0xffffff )
        },
    };

    const idleStateAttributes = {
        state: 'idle',
        attributes: {
            offset: 0.035,
            backgroundColor: new THREE.Color( 0x666666 ),
            backgroundOpacity: 0.3,
            fontColor: new THREE.Color( 0xffffff )
        },
    };

    const {
        width = 0.4,
        height = 0.15,
        justifyContent = 'center',
        offset = 0.05,
        margin = 0.02,
        borderRadius = 0.075,
        textAlign = 'center',
        fontFamily ='/viewer/public/fonts/Inter-variable-msdf.json',
        fontTexture = '/viewer/public/fonts/Inter-variable.png',
    } = buttonOptions;

    const button = new ThreeMeshUI.Block({
        width, height, justifyContent, offset, margin, borderRadius, textAlign, fontFamily, fontTexture,
    } );

    if(text instanceof ThreeMeshUI.Text)
        button.add(text)
    else
        button.add(
            new ThreeMeshUI.Text( { content: text } )
        )

    button.setupState( hoveredStateAttributes );
    button.setupState( idleStateAttributes );

    return button
}