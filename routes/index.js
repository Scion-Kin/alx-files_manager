const AppController = require('../controllers/AppController');

const routes = (app) => {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
};

module.exports = routes;
