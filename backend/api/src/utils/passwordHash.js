import bcrypt from "bcryptjs"

export const passwordHash = (password) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    return hash;
};

export const passwordVerify = (password, hash) => {
    return bcrypt.compareSync(password, hash);
};