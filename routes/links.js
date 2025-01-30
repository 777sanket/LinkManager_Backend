const express = require("express");
const shortid = require("shortid"); // For generating unique short links
const Links = require("../models/links.schema");
const Analysis = require("../models/analysis.schema");
const authMiddleware = require("../middleware/auth"); // For user authentication
const getUserDeviceInfo = require("../utils/getDevice");
const getLinkStatus = require("../utils/getLinkStatus");
const e = require("express");
const router = express.Router();

// /**
//  * Utility Function: Check if a link is active
//  * @param {Object} link - Link document
//  * @returns {boolean} - True if the link is active, false otherwise
//  */

// const getLinkStatus = (link) => {
//   if (!link.expirationTime) {
//     return true; // Active if no expiration time is set
//   }
//   return new Date() < new Date(link.expirationTime); // Active if current time is before expirationTime
// };

/**
 * POST: Create a new link
 * Endpoint: /create
 */
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { originalLink, remark, expirationTime } = req.body;

    // Validate input
    if (!originalLink) {
      return res.status(400).json({ error: "Original link is required" });
    }

    // Generate a unique shortened link
    const hostLink = `${req.headers.host}`;
    function extractWordBeforeSymbol(url) {
      // Match the last word before any symbol (-, ., _, :)
      const match = url.match(/(\w+)[:\-._]/);
      return match ? match[1] : null;
    }
    const extractedHistName = extractWordBeforeSymbol(hostLink);

    console.log("hostLink", hostLink);
    const shortenedLink = `${extractedHistName}/${shortid.generate()}`;
    // const shortenedLink = `${req.headers.host}/${shortid.generate()}`;

    // Create a new link document
    const newLink = new Links({
      user: req.user.id, // Extracted from the token by the auth middleware
      originalLink,
      shortenedLink,
      remark,
      expirationTime: expirationTime || null, // If not provided, set to null
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

/**
 * PUT: Edit an existing link
 * Endpoint: /edit/:id
 */
router.put("/edit/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params; // The ID of the link to edit
    const { originalLink, remark, expirationTime } = req.body;

    // Find the link by ID
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
        clicks: link.clicks, // Include current click count
        status: getLinkStatus(link) ? "active" : "inactive", // Dynamic status
      },
    });
  } catch (error) {
    console.error("Error editing link:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// router.get("/", authMiddleware, async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       sortBy = "dateCreated",
//       order = "desc",
//       statusSort,
//     } = req.query;

//     // Fetch all links for the user
//     const filters = { user: req.user.id };
//     const links = await Links.find(filters)
//       .sort({ [sortBy]: order === "desc" ? -1 : 1 }) // Sort by other fields like dateCreated
//       .skip((page - 1) * limit)
//       .limit(Number(limit));

//     // Add dynamic status and sort based on it if `statusSort` is provided
//     const responseLinks = links.map((link) => ({
//       id: link._id,
//       originalLink: link.originalLink,
//       shortenedLink: link.shortenedLink,
//       remark: link.remark,
//       expirationTime: link.expirationTime,
//       dateCreated: link.dateCreated,
//       clicks: link.clicks,
//       status: getLinkStatus(link) ? "active" : "inactive", // Dynamic status
//     }));

//     if (statusSort) {
//       responseLinks.sort((a, b) => {
//         if (statusSort === "activeFirst") {
//           return a.status === "active" && b.status === "inactive" ? -1 : 1;
//         }
//         if (statusSort === "inactiveFirst") {
//           return a.status === "inactive" && b.status === "active" ? -1 : 1;
//         }
//         return 0;
//       });
//     }

//     // Pagination metadata
//     const totalLinks = await Links.countDocuments(filters);

//     res.status(200).json({
//       message: "Links retrieved successfully",
//       links: responseLinks,
//       pagination: {
//         currentPage: Number(page),
//         totalPages: Math.ceil(totalLinks / limit),
//         totalLinks,
//       },
//     });
//   } catch (error) {
//     console.error("Error retrieving links:", error.message);
//     res.status(500).json({ error: "Server error" });
//   }
// });

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

    // Fetch **all** links for the user BEFORE pagination
    const filters = { user: req.user.id };

    // If search query exists, apply regex search on originalLink or remark
    if (search) {
      filters.$or = [
        { originalLink: { $regex: search, $options: "i" } },
        { remark: { $regex: search, $options: "i" } },
      ];
    }

    let allLinks = await Links.find(filters).sort({
      [sortBy]: order === "desc" ? -1 : 1,
    });

    // Convert each link to include computed "status"
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

    // **Apply status sorting BEFORE pagination**
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

    // Apply pagination AFTER filtering and sorting
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

    // Find the link by ID
    const link = await Links.findById(id);

    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    // Check if the authenticated user owns the link
    if (link.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this link" });
    }

    // Delete the link
    await link.remove();

    res.status(200).json({ message: "Link deleted successfully" });
  } catch (error) {
    console.error("Error deleting link:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
