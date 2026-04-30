const express = require("express");
const User = require("../models/User");

const router = express.Router();

// SEND TRUST REQUEST
router.post("/request/:userId", async (req, res) => {
  try {
    const { fromUserId } = req.body;
    const { userId } = req.params;

    if (fromUserId === userId) {
      return res.status(400).json({ message: "You cannot add yourself." });
    }

    const receiver = await User.findById(userId);

    if (!receiver) {
      return res.status(404).json({ message: "User not found." });
    }

    const alreadyRequested = receiver.pendingRequests.some(
      (request) => request.from.toString() === fromUserId,
    );

    if (alreadyRequested) {
      return res.status(400).json({ message: "Request already sent." });
    }

    receiver.pendingRequests.push({
      from: fromUserId,
      status: "pending",
    });

    await receiver.save();

    res.json({ message: "Trusted Circle request sent." });
  } catch (error) {
    console.error("Trust request error:", error);
    res.status(500).json({ message: "Failed to send request." });
  }
});

// GET MY REQUESTS
router.get("/requests/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "pendingRequests.from",
      "username email role",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const pending = user.pendingRequests.filter(
      (request) => request.status === "pending",
    );

    res.json(pending);
  } catch (error) {
    console.error("Get trust requests error:", error);
    res.status(500).json({ message: "Failed to load requests." });
  }
});

// APPROVE REQUEST
router.post("/approve/:userId/:requestId", async (req, res) => {
  try {
    const { userId, requestId } = req.params;

    const receiver = await User.findById(userId);

    if (!receiver) {
      return res.status(404).json({ message: "User not found." });
    }

    const request = receiver.pendingRequests.id(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    request.status = "approved";

    if (!receiver.trustedCircle.includes(request.from)) {
      receiver.trustedCircle.push(request.from);
    }

    const sender = await User.findById(request.from);

    if (sender && !sender.trustedCircle.includes(receiver._id)) {
      sender.trustedCircle.push(receiver._id);
      await sender.save();
    }

    await receiver.save();

    res.json({ message: "User added to Trusted Circle." });
  } catch (error) {
    console.error("Approve trust request error:", error);
    res.status(500).json({ message: "Failed to approve request." });
  }
});

// REJECT REQUEST
router.post("/reject/:userId/:requestId", async (req, res) => {
  try {
    const { userId, requestId } = req.params;

    const receiver = await User.findById(userId);

    if (!receiver) {
      return res.status(404).json({ message: "User not found." });
    }

    const request = receiver.pendingRequests.id(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    request.status = "rejected";
    await receiver.save();

    res.json({ message: "Request rejected." });
  } catch (error) {
    console.error("Reject trust request error:", error);
    res.status(500).json({ message: "Failed to reject request." });
  }
});

// GET TRUSTED CIRCLE
router.get("/circle/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "trustedCircle",
      "username email role",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user.trustedCircle);
  } catch (error) {
    console.error("Get trusted circle error:", error);
    res.status(500).json({ message: "Failed to load trusted circle." });
  }
});

module.exports = router;
