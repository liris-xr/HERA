import express from 'express'
import {baseUrl} from "./baseUrl.js";
import {resetDatabase} from "../orm/defaults/reset.js";
import {insertDefaults} from "../orm/defaults/insertDefaults.js";
import authMiddleware from "../middlewares/auth.js";


const router = express.Router()

router.get(baseUrl+'dev/hello', async (req, res) => {
    try{
        return res.send('Hello World !');
    }catch (e){
        console.log(e);
        res.status(400);
        return res.send('Error :(');
    }

})

router.get(baseUrl+'dev/reset-defaults', authMiddleware, async (req, res) => {
    const user = req.user
    if(!user.admin) {
        return res.status(401).send({ error: 'Unauthorized', details: 'User not granted' })
    }

    try {
        await resetDatabase();
        await insertDefaults();
        return res.send('Database reset and defaults inserted successfully.');
    } catch (e) {
        console.error(e);
        res.status(500).send('Error while resetting database');
    }
})



router.get('/api/dev/cert', (req, res) => {
    const redirectUrl = req.query.redirect;
    res.send(`
    <html lang="en">
      <body>
        <h1>Accept certificate</h1>
        <p>You will be redirected automatically after clicking "accept"</p>
        <script>
          setTimeout(() => {
            window.location.href = '${redirectUrl}';
          }, 1000);
        </script>
      </body>
    </html>
  `);
});

export default router
