/**
 * Permet d'éxécuter une fonction en réponse à un évènement
 * en évitant de faire planter le socket en cas d'erreur
 *
 * @param handler {function}: la fonction à appeler
 * @returns {(function(...[*]): Promise<void>)|*}
 */

export default function safeHandler(handler) {
    return async (...args) => {
        try {
            await handler(...args)
        } catch(error) {
            console.log("Caught error : ", error)
            if(args.length > 0 && typeof args[args.length-1] === "function") {
                const callback = args[args.length-1]
                callback({ success: false, error: "Internal server error" })
            }
        }
    }
}