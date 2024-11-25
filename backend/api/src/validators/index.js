export function getDetails (e) {
    return e.errors.map(error => error.message)
}
