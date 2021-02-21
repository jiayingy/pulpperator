import express from 'express';
import { PulpperatorError, PulpperatorBadRequest } from './error/pulpperatorError.mjs';
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

app.post('/print', async (req, res, next) => {
  const cookies = req.body.cookies || [];
  const url = req.body.url;

  if (!url) {
    const error = new PulpperatorBadRequest('Empty url given');
    res
      .status(400)
      .send(error.toJson());
    return;
  }

  try {
    const pdf = await print(url, cookies);
    res.contentType("application/pdf");
    res.send(pdf);
    return;
  } catch (error) {
    if (error instanceof PulpperatorError) {
      res
        .status(400)
        .send(error.toJson())
      ;
      return;
    }
    next(error);
    return;
  }
})