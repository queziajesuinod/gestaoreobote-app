const AuthService = require('../services/auth');

class AuthController {
  static async login(req, res) {
    const { email, password } = req.body;

    try {
      const user = await AuthService.login({ email, password });
      return res.status(200).send(user);
    } catch (error) {
      return res.status(401).send({ message: error.message });
    }
  }
}

module.exports = AuthController;
