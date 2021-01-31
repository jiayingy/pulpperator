import express from 'express';
import { print } from './print.mjs';

const app = express();
app.use(express.json());

const port = 3000;

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});

app.get('/', (req, res) => {
  res.json({
    message: 'ok'
  })
});

app.post('/print', async (req, res) => {
  const cookies = req.body.cookies || [];
  const url = req.body.url;

  if (!url) {
    res.status(400).send({
      message: 'No url found'
    });
  }

  try {
    const pdf = await print(url, cookies);
    res.contentType("application/pdf");
    res.send(pdf);
  } catch (error) {
    if (error instanceof PulpperatorBadRequest) {
      // send down a nice error 400
      res.statusCode = 400;
      res.json({
        error: 'bad request'
      });
      return;
    }

    if (error instanceof PulpperatorCrash) {
      res.statusCode = 400;
      res.json({
        error: 'unknown error'
      });
      return;
    }

    res.statusCode = 500;
    res.json({
      error: 'unknown error'
    });
  }
})