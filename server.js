const express = require('express');
const routes = require('./routes/index');

const app = express();

app.use(express.json());

routes(app);
app.listen(process.env.PORT || 5000);
