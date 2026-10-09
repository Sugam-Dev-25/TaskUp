// internal.routes.js

const express = require("express");
const accountsRepository = require("../accounts/accounts.repository");

const router = express.Router();

router.get("/users/:id", async (req, res) => {
  try {
    const user = await accountsRepository.getById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Internal user lookup failed:", error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
});

module.exports = router;