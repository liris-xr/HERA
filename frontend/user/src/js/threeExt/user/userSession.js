
export class UserSession {

    getUserId() {
        try{
            let id = localStorage.getItem("user_temp_id");
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem("user_temp_id", id);
            }
            return id;
        }catch(err){
            console.log(err);
            return -1;
        }
    }

}