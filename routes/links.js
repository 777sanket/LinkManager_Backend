const express = require("express");
const shortid = require("shortid");
const Links = require("../models/links.schema");
const Analysis = require("../models/analysis.schema");
const authMiddleware = require("../middleware/auth");
const getUserDeviceInfo = require("../utils/getDevice");
const getLinkStatus = require("../utils/getLinkStatus");
const e = require("express");
const router = express.Router();

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { originalLink, remark, expirationTime } = req.body;

    if (!originalLink) {
      return res.status(400).json({ error: "Original link is required" });
    }

    const shortenedLink = `${req.headers.host}/${shortid.generate()}`;

    // Create a new link document
    const newLink = new Links({
      user: req.user.id,
      originalLink,
      shortenedLink,
      remark,
      expirationTime: expirationTime || null,
    });

    // Save to database
    await newLink.save();

    res.status(201).json({
      message: "Link created successfully",
      link: {
        id: newLink._id,
        originalLink: newLink.originalLink,
        shortenedLink: newLink.shortenedLink,
        remark: newLink.remark,
        expirationTime: newLink.expirationTime,
        dateCreated: newLink.dateCreated,
        clicks: newLink.clicks, // Default is 0
        status: getLinkStatus(newLink) ? "active" : "inactive", // Dynamic status
      },
    });
  } catch (error) {
    console.error("Error creating link:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/edit/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { originalLink, remark, expirationTime } = req.body;

    const link = await Links.findById(id);

    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    // Check if the authenticated user owns the link
    if (link.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to edit this link" });
    }

    // Update fields if provided
    if (originalLink) link.originalLink = originalLink;
    if (remark) link.remark = remark;
    if (expirationTime !== undefined)
      link.expirationTime = expirationTime || null;

    // Save the updated link
    await link.save();

    res.status(200).json({
      message: "Link updated successfully",
      link: {
        id: link._id,
        originalLink: link.originalLink,
        shortenedLink: link.shortenedLink, // Unchanged
        remark: link.remark,
        expirationTime: link.expirationTime,
        dateCreated: link.dateCreated,
        clicks: link.clicks,
        status: getLinkStatus(link) ? "active" : "inactive", // Dynamic status
      },
    });
  } catch (error) {
    console.error("Error editing link:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "dateCreated",
      order = "desc",
      statusSort,
      search = "",
    } = req.query;

    const filters = { user: req.user.id };

    if (search) {
      filters.$or = [
        { originalLink: { $regex: search, $options: "i" } },
        { remark: { $regex: search, $options: "i" } },
      ];
    }

    let allLinks = await Links.find(filters).sort({
      [sortBy]: order === "desc" ? -1 : 1,
    });

    let responseLinks = allLinks.map((link) => ({
      id: link._id,
      originalLink: link.originalLink,
      shortenedLink: link.shortenedLink,
      remark: link.remark,
      expirationTime: link.expirationTime,
      dateCreated: link.dateCreated,
      clicks: link.clicks,
      status: getLinkStatus(link) ? "active" : "inactive", // Dynamic status
    }));

    if (statusSort) {
      responseLinks = responseLinks.sort((a, b) => {
        if (statusSort === "activeFirst") {
          return a.status === "active" && b.status === "inactive" ? -1 : 1;
        }
        if (statusSort === "inactiveFirst") {
          return a.status === "inactive" && b.status === "active" ? -1 : 1;
        }
        return 0;
      });
    }

    const totalLinks = responseLinks.length;
    responseLinks = responseLinks.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      message: "Links retrieved successfully",
      links: responseLinks,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalLinks / limit),
        totalLinks,
      },
    });
  } catch (error) {
    console.error("Error retrieving links:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const link = await Links.findById(id);

    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    if (link.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this link" });
    }

    await link.remove();

    res.status(200).json({ message: "Link deleted successfully" });
  } catch (error) {
    console.error("Error deleting link:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
