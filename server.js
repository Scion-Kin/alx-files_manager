const express = require('express');
const routes = require('./routes/index');

const app = express();

routes(app);
app.listen(process.env.PORT || 5000);
