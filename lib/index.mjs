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
  const options = req.body.options || [];

  try {
    const pdf = await print(options);
    res.contentType("application/pdf");
    res.send(pdf);
    return;
  } catch (error) {
    res
      .status(error instanceof PulpperatorError ? 400 : 500)
      .json({
        error: true,
        message: error.message
      });
    return;
  }
})