import express from 'express'
import {baseUrl} from "./baseUrl.js";


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



router.get('/api/dev/cert', (req, res) => {
    const redirectUrl = typeof req.query.redirect === "string" ? req.query.redirect : "/";
    const redirectJson = JSON.stringify(redirectUrl);
    res.send(`
    <html lang="en">
      <body>
        <h1>Accept certificate</h1>
        <p>You will be redirected automatically after clicking "accept"</p>
        <script>
          setTimeout(() => {
            window.location.href = ${redirectJson};
          }, 1000);
        </script>
      </body>
    </html>
  `);
});

export default router
