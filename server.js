const express = require('express');
const routes = require('./routes/index');

const app = express();

app.use(express.json({ limit: '50mb' }));

routes(app);
app.listen(process.env.PORT || 5000);
