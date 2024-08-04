const AppController = require('../controllers/AppController');
const createUser = require('../controllers/UsersController');

const routes = (app) => {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
  app.post('/users', createUser);
};

module.exports = routes;
