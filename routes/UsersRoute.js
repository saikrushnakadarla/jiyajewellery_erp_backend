const express = require('express');
const userController = require('../controllers/UsersController');

const router = express.Router();

router.post('/users', userController.createUser); // Insert user
router.get('/users', userController.getUsers);   // Fetch all users
// Get a user by ID
router.get('/users/:id', userController.getUserById);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

module.exports = router;
